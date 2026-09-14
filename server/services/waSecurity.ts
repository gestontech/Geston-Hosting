/**
 * WhatsApp-only security: detect insults / bad words / spam / malware-like
 * messages, block the sender via Baileys updateBlockStatus, and notify owner.
 * Owner/dev is never blocked.
 */
import { WaContact } from "../models/WaContact.js";
import { resolvePhoneNumber } from "../lib/waIdentity.js";
import { notifyOwner } from "./notify.js";
import { sendWaText } from "./whatsappSend.js";
import { logger } from "../logger.js";

type BlockSock = {
  updateBlockStatus?: (jid: string, action: "block" | "unblock") => Promise<unknown>;
  user?: { id?: string };
};

const DEFAULT_BAD_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "asshole",
  "bitch",
  "bastard",
  "dick",
  "pussy",
  "cunt",
  "nigger",
  "nigga",
  "whore",
  "slut",
  "faggot",
  "retard",
  "shit",
  "bullshit",
  "dumbass",
  "jackass",
];

/** Directed insults at the bot / AI / Geston Hosting */
const BOT_INSULT_PATTERNS: RegExp[] = [
  /\b(stupid|dumb|useless|trash|garbage|idiot|moron|scam|scammer)\s+(bot|ai|assistant)?\b/i,
  /\b(bot|ai|assistant|you)\s+(are|is)\s+(stupid|dumb|useless|trash|garbage|idiot|scam)\b/i,
  /\bf+u+c*k\s*(you|off|this\s*bot|the\s*bot|geston)\b/i,
  /\b(kill|destroy)\s*(yourself|the\s*bot|this\s*bot)\b/i,
  /\bgeston\s*host(ing)?\s*(is\s*)?(scam|trash|shit|fraud)\b/i,
  /\byou\s*(suck|are\s*worthless|are\s*a\s*scam)\b/i,
];

const MALWARE_SPAM_PATTERNS: RegExp[] = [
  /\b(free\s*nitro|steam\s*gift|claim\s*reward)\b/i,
  /\b(bit\.ly|tinyurl\.com|t\.me\/joinchat)\b/i,
  /\b(send\s*me\s*otp|share\s*your\s*otp|give\s*me\s*code)\b/i,
  /\b(malware|ransomware|trojan|keylogger)\b/i,
  /\b(hack\s*(whatsapp|account|password)|phishing)\b/i,
  /\b(crypto\s*airdrop|double\s*your\s*btc|send\s*btc\s*to)\b/i,
];

/** In-memory flood tracker: jid → timestamps */
const floodMap = new Map<string, number[]>();
const FLOOD_WINDOW_MS = 20_000;
const FLOOD_MAX = 8;

function digits(s: string): string {
  return String(s || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

/** Strip spaces, +, dashes, etc. from a phone / jid input. */
export function cleanWaPhone(raw: string): string {
  return digits(raw);
}

function isOwnerOrBot(senderJid: string, sock?: BlockSock): boolean {
  const from = digits(senderJid);
  if (!from || from.length < 8) return false;

  const dev = digits(process.env.DEV_WA_NUMBER || "");
  if (dev && from === dev) return true;

  const botId = sock?.user?.id || "";
  const botNum = digits(botId);
  if (botNum && from === botNum) return true;

  return false;
}

function containsBadWord(text: string): string | null {
  const lower = text.toLowerCase();
  for (const w of DEFAULT_BAD_WORDS) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("\\b" + escaped + "\\b", "i");
    if (re.test(lower)) return w;
  }
  return null;
}

function matchAny(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    if (re.test(text)) return re.source.slice(0, 80);
  }
  return null;
}

function isFlooding(jid: string): boolean {
  const now = Date.now();
  const arr = (floodMap.get(jid) || []).filter((t) => now - t < FLOOD_WINDOW_MS);
  arr.push(now);
  floodMap.set(jid, arr);
  return arr.length >= FLOOD_MAX;
}

export type AbuseVerdict =
  | { abuse: false }
  | { abuse: true; reason: string; detail: string };

export function evaluateAbuse(text: string, senderJid: string): AbuseVerdict {
  const raw = String(text || "").trim();
  if (!raw) return { abuse: false };

  if (isFlooding(senderJid)) {
    return { abuse: true, reason: "spam_flood", detail: "Message flood detected" };
  }

  const bad = containsBadWord(raw);
  if (bad) {
    return { abuse: true, reason: "bad_word", detail: "Matched: " + bad };
  }

  const insult = matchAny(raw, BOT_INSULT_PATTERNS);
  if (insult) {
    return { abuse: true, reason: "bot_insult", detail: "Insult pattern" };
  }

  const malware = matchAny(raw, MALWARE_SPAM_PATTERNS);
  if (malware) {
    return { abuse: true, reason: "malware_spam", detail: "Suspicious / scam pattern" };
  }

  return { abuse: false };
}

function toBlockJid(senderJid: string): string {
  const d = digits(senderJid);
  if (d.length >= 8) return d + "@s.whatsapp.net";
  return String(senderJid || "");
}

async function markBlockedInDb(jid: string, reason: string): Promise<void> {
  const phone = resolvePhoneNumber(jid) || digits(jid);
  await WaContact.findOneAndUpdate(
    { jid },
    {
      $set: {
        isBlocked: true,
        blockedAt: new Date(),
        blockReason: reason.slice(0, 200),
        lastSeenAt: new Date(),
        ...(phone ? { phoneNumber: phone } : {}),
      },
      $setOnInsert: {
        jid,
        consentStatus: "declined",
        firstSeenAt: new Date(),
        messageCount: 0,
        clientDevice: "unknown",
      },
    },
    { upsert: true }
  ).catch((err) => logger.warn({ err }, "markBlockedInDb failed"));
}

/**
 * Unban a WhatsApp user by phone or jid.
 * Clears isBlocked in DB and optionally calls Baileys unblock.
 */
export async function unbanWaContact(
  rawPhoneOrJid: string,
  sock?: BlockSock | null
): Promise<{ ok: boolean; phone: string; message: string }> {
  const phone = cleanWaPhone(rawPhoneOrJid);
  if (!phone || phone.length < 8) {
    return { ok: false, phone: "", message: "Invalid number. Usage: .unban 2547xxxxxxxx" };
  }

  const jid = phone + "@s.whatsapp.net";
  const result = await WaContact.updateMany(
    {
      $or: [{ phoneNumber: phone }, { jid }, { jid: new RegExp("^" + phone) }],
    },
    {
      $set: {
        isBlocked: false,
        blockedAt: null,
        blockReason: "",
        lastSeenAt: new Date(),
      },
    }
  ).catch(() => null);

  let apiOk = false;
  try {
    if (sock?.updateBlockStatus) {
      await sock.updateBlockStatus(jid, "unblock");
      apiOk = true;
    }
  } catch (err) {
    logger.warn({ err, jid }, "updateBlockStatus unblock failed");
  }

  const matched = result ? (result as { matchedCount?: number }).matchedCount ?? 0 : 0;
  const msg =
    "Unbanned +" +
    phone +
    (matched > 0 ? " (DB updated)" : " (no prior DB block row; flags cleared if any)") +
    (apiOk ? " · WhatsApp unblock sent" : " · WhatsApp unblock skipped/unavailable");

  logger.info({ phone, matched, apiOk }, "WA unban");
  return { ok: true, phone, message: msg };
}

/**
 * Returns true if the sender was blocked (caller should stop handling the message).
 * Owner/dev is never blocked.
 */
export async function maybeBlockAbusiveUser(opts: {
  sock: BlockSock | null | undefined;
  chatJid: string;
  senderJid: string;
  text: string;
  isGroup: boolean;
}): Promise<boolean> {
  const { sock, chatJid, senderJid, text, isGroup } = opts;

  if (isOwnerOrBot(senderJid, sock || undefined)) return false;

  const verdict = evaluateAbuse(text, senderJid);
  if (!verdict.abuse) return false;

  const blockJid = toBlockJid(senderJid);
  const phone = digits(blockJid);

  logger.warn(
    { blockJid, reason: verdict.reason, isGroup, chatJid },
    "WA security: blocking user"
  );

  await markBlockedInDb(senderJid, verdict.reason);
  if (blockJid !== senderJid) {
    await markBlockedInDb(blockJid, verdict.reason);
  }

  let blockedOk = false;
  try {
    if (sock?.updateBlockStatus) {
      await sock.updateBlockStatus(blockJid, "block");
      blockedOk = true;
    }
  } catch (err) {
    logger.warn({ err, blockJid }, "updateBlockStatus failed");
  }

  const notice =
    "🚫 You have been blocked for abusive or suspicious behavior.\n" +
    "Reason: " +
    verdict.reason.replace(/_/g, " ") +
    "\n\nIf this was a mistake, contact the developer.";
  await sendWaText(chatJid, notice).catch(() => {});

  const report =
    "🚨 WA auto-block\n\n" +
    "User: +" +
    phone +
    "\n" +
    "JID: " +
    blockJid +
    "\n" +
    "Chat: " +
    chatJid +
    "\n" +
    "Reason: " +
    verdict.reason +
    "\n" +
    "Detail: " +
    verdict.detail +
    "\n" +
    "Block API: " +
    (blockedOk ? "ok" : "failed/unavailable") +
    "\n\n" +
    "Message:\n" +
    text.slice(0, 400);

  await notifyOwner(report).catch(() => {});

  const dev = digits(process.env.DEV_WA_NUMBER || "");
  if (dev && sock) {
    const devJid = dev + "@s.whatsapp.net";
    if (devJid !== chatJid) {
      await sendWaText(devJid, report).catch(() => {});
    }
  }

  return true;
}

export async function isContactBlocked(jid: string): Promise<boolean> {
  try {
    const doc = await WaContact.findOne({
      $or: [{ jid }, { jid: toBlockJid(jid) }],
      isBlocked: true,
    })
      .select("isBlocked")
      .lean();
    return !!(doc as { isBlocked?: boolean } | null)?.isBlocked;
  } catch {
    return false;
  }
}
