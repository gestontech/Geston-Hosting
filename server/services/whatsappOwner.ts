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
  ws?: { close: () => void };
  user?: { id: string };
  sendMessage?: (jid: string, content: Record<string, unknown>) => Promise<unknown>;
  updateBlockStatus?: (jid: string, action: "block" | "unblock") => Promise<unknown>;
  ev: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    removeAllListeners?: (event?: string) => void;
  };
};

type PublicHandler = (msg: WaIncomingMessage) => Promise<void>;

let activeSock: Sock | null = null;
let activeOwnerId: string | null = null;
let pairingInProgress = false;
/** Last pairing code issued — kept until connected or explicit logout/new request. */
let lastPairingCode: string | null = null;
let lastPairingPhone: string | null = null;
let publicHandler: PublicHandler | null = null;

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
      await WaOwnerSession.findOneAndUpdate(
        { ownerId: ownerId },
        {
          ownerId: ownerId,
          phoneNumber: phone,
          credsJson: data,
          status: "connected",
          lastConnectedAt: new Date(),
        },
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
      const sock = baileys.default({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: baileys.makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: browserTriplet(),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 30000,
      });

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
          if (finished) return;
          const update = args[0] as {
            connection?: string;
            lastDisconnect?: { error?: { output?: { statusCode?: number } } };
          };
          const { connection, lastDisconnect } = update || {};

          if (connection === "open") {
            clearTimeout(timer);
            finished = true;
            pairingInProgress = false;
            lastPairingCode = null;
            lastPairingPhone = null;
            try {
              await saveCreds();
            } catch {}
            await persistCredsWithRetry(ownerId, phone, dir, baileys.delay);
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
  const dir = sessionDir(ownerId);
  removeDir(dir);
  const restored = await restoreCredsFromDb(ownerId, dir);
  if (!restored) return { ok: false, error: "No saved session in database" };

  let finished = false;
  let closeRetries = 0;
  const MAX_CLOSE_RETRIES = 5;

  try {
    const baileys = await loadBaileys();

    async function startReconnect(): Promise<{ ok: boolean; error?: string }> {
      if (finished) return { ok: false, error: "Reconnect cancelled" };

      const { state, saveCreds } = await baileys.useMultiFileAuthState(dir);
      const version = await fetchBaileysVersion();

      closeSockQuietly(activeSock);
      const sock = baileys.default({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: baileys.makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["Ubuntu", "Chrome", "1.0.0"],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 30000,
      });

      activeSock = sock;
      activeOwnerId = ownerId;
      wireMessages(sock);

      sock.ev.on("creds.update", async () => {
        try {
          await saveCreds();
        } catch (err) {
          logger.warn({ err }, "creds.update save failed");
        }
      });

      return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        const timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          resolve({ ok: false, error: "Reconnect timeout" });
        }, 90000);

        sock.ev.on("connection.update", async (...args: unknown[]) => {
          if (finished) return;
          const update = args[0] as {
            connection?: string;
            lastDisconnect?: { error?: { output?: { statusCode?: number } } };
          };
          const connection = update?.connection;
          const statusCode = update?.lastDisconnect?.error?.output?.statusCode;

          if (connection === "open") {
            clearTimeout(timer);
            finished = true;
            lastPairingCode = null;
            lastPairingPhone = null;
            pairingInProgress = false;
            const doc = await WaOwnerSession.findOne({ ownerId }).lean();
            await persistCredsWithRetry(
              ownerId,
              doc?.phoneNumber || "",
              dir,
              baileys.delay
            ).catch(() => {});
            resolve({ ok: true });
            return;
          }

          if (connection === "close") {
            if (statusCode === 401) {
              clearTimeout(timer);
              finished = true;
              closeSockQuietly(activeSock);
              activeSock = null;
              activeOwnerId = null;
              setWaSendSock(null);
              await WaOwnerSession.findOneAndUpdate(
                { ownerId },
                { status: "disconnected", credsJson: "" }
              ).catch(() => {});
              resolve({ ok: false, error: "Logged out" });
              return;
            }

            closeRetries += 1;
            if (closeRetries > MAX_CLOSE_RETRIES) {
              clearTimeout(timer);
              finished = true;
              resolve({ ok: false, error: "Reconnect failed after retries" });
              return;
            }

            logger.info({ closeRetries, statusCode }, "Reconnect closed, retrying");
            await baileys.delay(3000);
            if (finished) return;
            clearTimeout(timer);
            const result = await startReconnect();
            resolve(result);
          }
        });
      });
    }

    return await startReconnect();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Reconnect failed" };
  }
}

export async function tryAutoReconnect(ownerId: string): Promise<void> {
  if (!ownerId) return;
  if (activeSock && activeOwnerId && !pairingInProgress) return;
  const doc = await WaOwnerSession.findOne({ ownerId }).lean();
  if (!doc?.credsJson) return;
  logger.info({ ownerId }, "Auto-reconnecting WhatsApp session from database");
  const result = await reconnectFromDb(ownerId);
  if (result.ok) logger.info("WhatsApp auto-reconnect succeeded");
  else logger.warn({ error: result.error }, "WhatsApp auto-reconnect failed");
}

export async function disconnectWa(ownerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    closeSockQuietly(activeSock);
    activeSock = null;
    activeOwnerId = null;
    pairingInProgress = false;
    setWaSendSock(null);
    await WaOwnerSession.findOneAndUpdate(
      { ownerId },
      { status: "disconnected" }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Disconnect failed" };
  }
}

export async function logoutWa(ownerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
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
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Logout failed" };
  }
}

export { cleanPhone };
