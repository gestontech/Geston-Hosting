import fs from "fs";
import path from "path";
import os from "os";
import pino from "pino";
import { fileURLToPath } from "url";
import { WaOwnerSession } from "../models/WaOwnerSession.js";
import { logger } from "../logger.js";
import { notifyOwner } from "./notify.js";
import { attachMessageHandler } from "./whatsappMessages.js";
import { setWaSendSock, sendWaText as sendWaTextCore } from "./whatsappSend.js";
export type { WaIncomingMessage } from "./whatsappMessages.js";
import type { WaIncomingMessage } from "./whatsappMessages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_ROOT = path.join(__dirname, "../../wa-owner-sessions");

type Sock = {
  requestPairingCode: (num: string) => Promise<string>;
  logout: () => Promise<void>;
  end?: (err?: Error) => void;
  ws?: { close: () => void; isOpen?: boolean };
  user?: { id: string };
  sendMessage?: (jid: string, content: Record<string, unknown>) => Promise<unknown>;
  updateBlockStatus?: (jid: string, action: "block" | "unblock") => Promise<unknown>;
  query?: (node: unknown) => Promise<unknown>;
  ev: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    removeAllListeners?: (event?: string) => void;
  };
};

type PublicHandler = (msg: WaIncomingMessage) => Promise<void>;

let activeSock: Sock | null = null;
let activeOwnerId: string | null = null;
let pairingInProgress = false;
let lastPairingCode: string | null = null;
let lastPairingPhone: string | null = null;
let publicHandler: PublicHandler | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isStarting = false;
let shuttingDown = false;
let lastActivity = Date.now();
let watchdogInterval: ReturnType<typeof setInterval> | null = null;
const MAX_RECONNECT_ATTEMPTS = 30;
const BASE_RECONNECT_DELAY = 2000;

function cleanPhone(raw: string): string {
  return String(raw || "").replace(/[^\d]/g, "");
}

function sessionDir(ownerId: string): string {
  return path.join(SESSION_ROOT, ownerId);
}

function removeDir(dir: string) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function closeSockQuietly(sock: Sock | null) {
  if (!sock) return;
  try {
    sock.ev.removeAllListeners?.();
  } catch {}
  try {
    sock.ws?.close();
  } catch {}
  try {
    sock.end?.();
  } catch {}
}

async function loadBaileys() {
  const mod = await import("toxic-baileys");
  return mod as unknown as {
    default: (opts: Record<string, unknown>) => Sock;
    useMultiFileAuthState: (dir: string) => Promise<{ state: { creds: unknown; keys: unknown }; saveCreds: () => Promise<void> }>;
    delay: (ms: number) => Promise<void>;
    makeCacheableSignalKeyStore: (keys: unknown, logger: unknown) => unknown;
    Browsers: Record<string, unknown>;
  };
}

async function persistCredsWithRetry(
  ownerId: string,
  phone: string,
  dir: string,
  delayFn: (ms: number) => Promise<void>
): Promise<boolean> {
  const credsPath = path.join(dir, "creds.json");
  for (let attempt = 1; attempt <= 10; attempt++) {
    await delayFn(3000);
    try {
      if (!fs.existsSync(credsPath)) {
        logger.warn({ attempt }, "creds.json not found yet");
        continue;
      }
      const data = fs.readFileSync(credsPath, "utf8");
      if (!data || data.length < 50) {
        logger.warn({ attempt, len: data?.length || 0 }, "creds.json still too small");
        continue;
      }
      const update: Record<string, unknown> = {
        ownerId: ownerId,
        credsJson: data,
        status: "connected",
        lastConnectedAt: new Date(),
      };
      if (phone) update.phoneNumber = phone;
      await WaOwnerSession.findOneAndUpdate(
        { ownerId: ownerId },
        update,
        { upsert: true }
      );
      logger.info({ ownerId, attempt }, "WhatsApp owner session saved to database");
      return true;
    } catch (err) {
      logger.warn({ err, attempt }, "persistCreds attempt failed");
    }
  }
  logger.error({ ownerId }, "Failed to persist WhatsApp creds after 10 retries");
  await notifyOwner(
    "WhatsApp connected but session save failed after 10 retries. Run /connect again if status drops."
  );
  return false;
}

async function restoreCredsFromDb(ownerId: string, dir: string): Promise<boolean> {
  const doc = await WaOwnerSession.findOne({ ownerId: ownerId }).lean();
  if (!doc?.credsJson) return false;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "creds.json"), doc.credsJson, "utf8");
  return true;
}

export function setPublicMessageHandler(handler: PublicHandler | null): void {
  publicHandler = handler;
}

export async function sendWaText(jid: string, text: string): Promise<boolean> {
  setWaSendSock(activeSock);
  return sendWaTextCore(jid, text);
}

export function getWaStatus(): {
  connected: boolean;
  ownerId: string | null;
  pairing: boolean;
  pairingCode: string | null;
  pairingPhone: string | null;
} {
  return {
    connected: !!(activeSock && activeOwnerId && !pairingInProgress && activeSock.user),
    ownerId: activeOwnerId,
    pairing: pairingInProgress,
    pairingCode: lastPairingCode,
    pairingPhone: lastPairingPhone,
  };
}

/** Active Baileys socket (for unblock / low-level ops). */
export function getActiveWaSock(): {
  updateBlockStatus?: (jid: string, action: "block" | "unblock") => Promise<unknown>;
  user?: { id?: string };
} | null {
  return activeSock;
}

export async function getWaStatusDetailed(): Promise<{
  connected: boolean;
  ownerId: string | null;
  pairing: boolean;
  pairingCode: string | null;
  pairingPhone: string | null;
  phoneNumber: string;
  dbStatus: string;
  lastConnectedAt: Date | null;
}> {
  const live = getWaStatus();
  const ownerId = live.ownerId || String(process.env.BOT_OWNER_ID || "");
  let phoneNumber = "";
  let dbStatus = "disconnected";
  let lastConnectedAt: Date | null = null;
  if (ownerId) {
    const doc = await WaOwnerSession.findOne({ ownerId: ownerId }).lean();
    if (doc) {
      phoneNumber = doc.phoneNumber || "";
      dbStatus = doc.status || "disconnected";
      lastConnectedAt = doc.lastConnectedAt || null;
    }
  }
  // Connected if live socket is up OR we have open connection without pairing flag
  const connected = !!(activeSock && activeOwnerId && !pairingInProgress);
  return {
    connected,
    ownerId: live.ownerId,
    pairing: pairingInProgress,
    pairingCode: lastPairingCode,
    pairingPhone: lastPairingPhone,
    phoneNumber,
    dbStatus,
    lastConnectedAt,
  };
}

async function fetchBaileysVersion(): Promise<number[]> {
  let version: number[] = [2, 3000, 1015901307];
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json"
    );
    const json = (await res.json()) as { version?: number[] };
    if (Array.isArray(json.version) && json.version.length >= 3) version = json.version;
  } catch {}
  return version;
}

function browserTriplet(): [string, string, string] {
  const platform = os.platform();
  const browserDesc = platform === "darwin" ? "Mac OS" : platform === "win32" ? "Windows" : "Ubuntu";
  const browserName = platform === "darwin" ? "Safari" : platform === "win32" ? "Edge" : "Chrome";
  return [browserDesc, browserName, "1.0.0"];
}

function stableSocketOpts(version: number[], auth: Record<string, unknown>): Record<string, unknown> {
  return {
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth,
    browser: browserTriplet(),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    emitOwnEvents: true,
    fireInitQueries: true,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    generateHighQualityLinkPreview: true,
    getMessage: async () => undefined,
  };
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function stopWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
}

function startWatchdog(ownerId: string) {
  stopWatchdog();
  watchdogInterval = setInterval(async () => {
    try {
      if (shuttingDown || isStarting || pairingInProgress) return;
      const sock = activeSock;
      if (!sock) return;
      const silentMs = Date.now() - lastActivity;
      if (silentMs < 5 * 60 * 1000) return;
      if (!sock.ws || sock.ws.isOpen === false) {
        logger.warn("Connection watchdog: socket not open — scheduling reconnect");
        activeSock = null;
        closeSockQuietly(sock);
        scheduleReconnect(ownerId);
        return;
      }
      if (typeof sock.query === "function") {
        try {
          await sock.query({
            tag: "iq",
            attrs: { to: "s.whatsapp.net", xmlns: "passive", type: "set" },
            content: [{ tag: "active", attrs: {} }],
          });
          lastActivity = Date.now();
        } catch {
          logger.warn("Connection watchdog: ping failed — scheduling reconnect");
          activeSock = null;
          closeSockQuietly(sock);
          scheduleReconnect(ownerId);
        }
      } else {
        lastActivity = Date.now();
      }
    } catch {}
  }, 30 * 1000);
}

function scheduleReconnect(ownerId: string) {
  if (shuttingDown || pairingInProgress) return;
  if (reconnectTimer) return;
  const attempts = reconnectAttempts;
  let delay: number;
  if (attempts < MAX_RECONNECT_ATTEMPTS) {
    delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.5, attempts), 30000);
  } else {
    delay = 30000;
    reconnectAttempts = 0;
  }
  reconnectAttempts += 1;
  logger.info({ ownerId, attempt: reconnectAttempts, delay }, "Scheduling connection reconnect");
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectFromDb(ownerId).catch((err) => {
      logger.warn({ err }, "Scheduled reconnect failed");
      scheduleReconnect(ownerId);
    });
  }, delay);
}

function wireMessages(sock: Sock) {
  setWaSendSock(sock);
  attachMessageHandler(sock, () => publicHandler);
}

export async function connectWithPairingCode(
  ownerId: string,
  rawPhone: string,
  onCode: (code: string) => Promise<void>,
  onConnected?: () => Promise<void>
): Promise<{ ok: boolean; error?: string }> {
  const phone = cleanPhone(rawPhone);
  if (!phone || phone.length < 8) {
    return { ok: false, error: "Invalid phone number" };
  }

  // If already pairing with a code for this phone, just re-deliver the code
  if (pairingInProgress && lastPairingCode && lastPairingPhone === phone) {
    await onCode(lastPairingCode).catch(() => {});
    return { ok: true };
  }

  // Cancel any stuck pairing so a new request can start
  if (pairingInProgress) {
    logger.info("Cancelling stuck pairing to start a new one");
    pairingInProgress = false;
    closeSockQuietly(activeSock);
    activeSock = null;
    activeOwnerId = null;
    setWaSendSock(null);
  }

  pairingInProgress = true;
  lastPairingCode = null;
  lastPairingPhone = phone;
  const dir = sessionDir(ownerId);
  removeDir(dir);
  fs.mkdirSync(dir, { recursive: true });

  let codeDelivered = false;
  let finished = false;
  let closeRetries = 0;
  const MAX_CLOSE_RETRIES = 8;

  try {
    const baileys = await loadBaileys();

    await WaOwnerSession.findOneAndUpdate(
      { ownerId },
      { ownerId, phoneNumber: phone, status: "pairing" },
      { upsert: true }
    );

    async function startPairing(): Promise<{ ok: boolean; error?: string }> {
      if (finished) return { ok: false, error: "Pairing cancelled" };

      const version = await fetchBaileysVersion();
      const { state, saveCreds } = await baileys.useMultiFileAuthState(dir);

      closeSockQuietly(activeSock);
      const sock = baileys.default(
        stableSocketOpts(version, {
          creds: state.creds,
          keys: baileys.makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        })
      );

      activeSock = sock;
      activeOwnerId = ownerId;
      wireMessages(sock);
      sock.ev.on("creds.update", saveCreds);

      const creds = state.creds as { registered?: boolean };
      if (!creds.registered) {
        await baileys.delay(2500);
        try {
          const code = await sock.requestPairingCode(phone);
          const clean = String(code || "").replace(/\s+/g, "");
          if (clean) {
            lastPairingCode = clean;
            lastPairingPhone = phone;
            if (!codeDelivered) {
              await onCode(clean);
              codeDelivered = true;
            }
          }
        } catch (err) {
          logger.warn({ err }, "requestPairingCode failed");
        }
      }

      return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          pairingInProgress = false;
          resolve({ ok: false, error: "Pairing timeout" });
        }, 300000);

        sock.ev.on("connection.update", async (...args: unknown[]) => {
          const update = args[0] as {
            connection?: string;
            lastDisconnect?: { error?: { output?: { statusCode?: number } } };
          };
          const { connection, lastDisconnect } = update || {};
          lastActivity = Date.now();

          if (finished && connection === "close") {
            if (shuttingDown) return;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            stopWatchdog();
            activeSock = null;
            setWaSendSock(null);
            if (statusCode === 401) {
              await WaOwnerSession.findOneAndUpdate(
                { ownerId },
                { status: "disconnected", credsJson: "" }
              );
              return;
            }
            scheduleReconnect(ownerId);
            return;
          }

          if (finished) return;

          if (connection === "open") {
            clearTimeout(timer);
            finished = true;
            pairingInProgress = false;
            lastPairingCode = null;
            lastPairingPhone = null;
            reconnectAttempts = 0;
            lastActivity = Date.now();
            try {
              await saveCreds();
            } catch {}
            await persistCredsWithRetry(ownerId, phone, dir, baileys.delay);
            startWatchdog(ownerId);
            if (onConnected) await onConnected().catch(() => {});
            resolve({ ok: true });
            return;
          }

          if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === 401) {
              clearTimeout(timer);
              finished = true;
              pairingInProgress = false;
              lastPairingCode = null;
              lastPairingPhone = null;
              closeSockQuietly(activeSock);
              activeSock = null;
              activeOwnerId = null;
              setWaSendSock(null);
              await WaOwnerSession.findOneAndUpdate(
                { ownerId },
                { status: "disconnected", credsJson: "" }
              );
              resolve({ ok: false, error: "Logged out" });
              return;
            }

            if (finished) return;
            closeRetries += 1;
            if (closeRetries > MAX_CLOSE_RETRIES) {
              clearTimeout(timer);
              finished = true;
              pairingInProgress = false;
              resolve({ ok: false, error: "Pairing failed after reconnect retries" });
              return;
            }

            logger.info({ closeRetries, statusCode }, "Connection closed during pairing, retrying");
            await baileys.delay(3000);
            if (finished) return;
            clearTimeout(timer);
            const result = await startPairing();
            resolve(result);
          }
        });
      });
    }

    return await startPairing();
  } catch (err) {
    pairingInProgress = false;
    logger.error({ err }, "WhatsApp pairing failed");
    return { ok: false, error: err instanceof Error ? err.message : "Pairing failed" };
  }
}

export async function reconnectFromDb(ownerId: string): Promise<{ ok: boolean; error?: string }> {
  if (isStarting) return { ok: false, error: "Reconnect already in progress" };
  if (pairingInProgress) return { ok: false, error: "Pairing in progress" };
  isStarting = true;
  clearReconnectTimer();

  const dir = sessionDir(ownerId);
  removeDir(dir);
  const restored = await restoreCredsFromDb(ownerId, dir);
  if (!restored) {
    isStarting = false;
    return { ok: false, error: "No saved session in database" };
  }

  let settled = false;

  try {
    const baileys = await loadBaileys();
    const { state, saveCreds } = await baileys.useMultiFileAuthState(dir);
    const version = await fetchBaileysVersion();

    closeSockQuietly(activeSock);
    const sock = baileys.default(
      stableSocketOpts(version, {
        creds: state.creds,
        keys: baileys.makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      })
    );

    activeSock = sock;
    activeOwnerId = ownerId;
    wireMessages(sock);
    lastActivity = Date.now();

    sock.ev.on("creds.update", async () => {
      try {
        await saveCreds();
        const doc = await WaOwnerSession.findOne({ ownerId }).lean();
        await persistCredsWithRetry(ownerId, doc?.phoneNumber || "", dir, baileys.delay).catch(() => {});
      } catch (err) {
        logger.warn({ err }, "creds.update save failed");
      }
    });

    const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        isStarting = false;
        resolve({ ok: false, error: "Reconnect timeout" });
      }, 90000);

      sock.ev.on("connection.update", async (...args: unknown[]) => {
        const update = args[0] as {
          connection?: string;
          lastDisconnect?: { error?: { output?: { statusCode?: number } } };
        };
        const connection = update?.connection;
        const statusCode = update?.lastDisconnect?.error?.output?.statusCode;
        lastActivity = Date.now();

        if (connection === "open") {
          clearTimeout(timer);
          reconnectAttempts = 0;
          pairingInProgress = false;
          lastPairingCode = null;
          lastPairingPhone = null;
          const doc = await WaOwnerSession.findOne({ ownerId }).lean();
          const phone = doc?.phoneNumber || "";
          try {
            await saveCreds();
          } catch {}
          await persistCredsWithRetry(ownerId, phone, dir, baileys.delay);
          startWatchdog(ownerId);
          if (!settled) {
            settled = true;
            isStarting = false;
            resolve({ ok: true });
          }
          return;
        }

        if (connection === "close") {
          if (shuttingDown) return;
          stopWatchdog();
          activeSock = null;
          setWaSendSock(null);

          if (statusCode === 401) {
            clearTimeout(timer);
            shuttingDown = true;
            clearReconnectTimer();
            await WaOwnerSession.findOneAndUpdate(
              { ownerId },
              { status: "disconnected", credsJson: "" }
            );
            if (!settled) {
              settled = true;
              isStarting = false;
              resolve({ ok: false, error: "Logged out" });
            }
            shuttingDown = false;
            return;
          }

          if (!settled) {
            clearTimeout(timer);
            settled = true;
            isStarting = false;
            resolve({ ok: false, error: "Connection closed during connect" });
          }

          scheduleReconnect(ownerId);
        }
      });
    });

    isStarting = false;
    return result;
  } catch (err) {
    isStarting = false;
    scheduleReconnect(ownerId);
    return { ok: false, error: err instanceof Error ? err.message : "Reconnect failed" };
  }
}

export async function tryAutoReconnect(ownerId: string): Promise<void> {
  if (!ownerId) return;
  if (activeSock && activeOwnerId && !pairingInProgress && activeSock.user) return;
  const doc = await WaOwnerSession.findOne({ ownerId }).lean();
  if (!doc?.credsJson) return;
  logger.info({ ownerId }, "Auto-reconnecting WhatsApp session from database");
  const result = await reconnectFromDb(ownerId);
  if (result.ok) logger.info("WhatsApp auto-reconnect succeeded");
  else {
    logger.warn({ error: result.error }, "WhatsApp auto-reconnect failed");
    scheduleReconnect(ownerId);
  }
}

export async function disconnectWa(ownerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    shuttingDown = true;
    clearReconnectTimer();
    stopWatchdog();
    closeSockQuietly(activeSock);
    activeSock = null;
    activeOwnerId = null;
    pairingInProgress = false;
    setWaSendSock(null);
    await WaOwnerSession.findOneAndUpdate(
      { ownerId },
      { status: "disconnected" }
    );
    shuttingDown = false;
    return { ok: true };
  } catch (err) {
    shuttingDown = false;
    return { ok: false, error: err instanceof Error ? err.message : "Disconnect failed" };
  }
}

export async function logoutWa(ownerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    shuttingDown = true;
    clearReconnectTimer();
    stopWatchdog();
    if (activeSock) {
      try {
        await activeSock.logout();
      } catch {}
    }
    closeSockQuietly(activeSock);
    activeSock = null;
    activeOwnerId = null;
    pairingInProgress = false;
    lastPairingCode = null;
    lastPairingPhone = null;
    setWaSendSock(null);
    removeDir(sessionDir(ownerId));
    await WaOwnerSession.findOneAndUpdate(
      { ownerId },
      { status: "disconnected", credsJson: "", phoneNumber: "" }
    );
    shuttingDown = false;
    return { ok: true };
  } catch (err) {
    shuttingDown = false;
    return { ok: false, error: err instanceof Error ? err.message : "Logout failed" };
  }
}

export { cleanPhone };
