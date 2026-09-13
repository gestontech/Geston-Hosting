import { logger } from "../logger.js";
import { resolveSenderJid, resolvePhoneNumber } from "../lib/waIdentity.js";
import { isTNumber } from "../lib/tNumbers.js";
import { maybeHandleOwnerTx } from "./waOwnerTxBridge.js";
import { sendWaText, sendWaTyping } from "./whatsappSend.js";
import { runAIChat } from "./aiChat.js";
import { getSiteUrl } from "../lib/siteUrl.js";
import { recordDeviceFromIncoming } from "./waDevicePref.js";
import { maybeBlockAbusiveUser, isContactBlocked } from "./waSecurity.js";

type Sock = {
  user?: { id?: string; lid?: string };
  updateBlockStatus?: (jid: string, action: "block" | "unblock") => Promise<unknown>;
  ev: {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
  };
};

export type WaIncomingMessage = {
  /** Chat jid — group (@g.us) or DM */
  jid: string;
  /** Sender participant jid in groups; same as jid in DMs */
  sender: string;
  text: string;
  fromMe: boolean;
  isGroup: boolean;
  /** True when bot was @mentioned or the message is a reply to the bot */
  isBotMentioned: boolean;
  mentionedJids: string[];
};

type PublicHandler = (msg: WaIncomingMessage) => Promise<void>;

function digits(s: string): string {
  return String(s || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function isBroadcastOrStatus(jid: string): boolean {
  const j = String(jid || "").toLowerCase();
  if (!j) return true;
  if (j === "status@broadcast") return true;
  if (j.endsWith("@broadcast")) return true;
  if (j.endsWith("@newsletter")) return true;
  return false;
}

function extractText(message: Record<string, unknown> | undefined): string {
  if (!message) return "";
  const conv = message.conversation;
  if (typeof conv === "string") return conv;
  const ext = message.extendedTextMessage as { text?: string } | undefined;
  if (ext?.text) return ext.text;
  const img = message.imageMessage as { caption?: string } | undefined;
  if (img?.caption) return img.caption;
  const vid = message.videoMessage as { caption?: string } | undefined;
  if (vid?.caption) return vid.caption;

  const btn = message.buttonsResponseMessage as
    | { selectedButtonId?: string; selectedDisplayText?: string }
    | undefined;
  if (btn?.selectedButtonId) return String(btn.selectedButtonId);
  if (btn?.selectedDisplayText) return String(btn.selectedDisplayText);

  const tmpl = message.templateButtonReplyMessage as
    | { selectedId?: string; selectedDisplayText?: string }
    | undefined;
  if (tmpl?.selectedId) return String(tmpl.selectedId);
  if (tmpl?.selectedDisplayText) return String(tmpl.selectedDisplayText);

  const list = message.listResponseMessage as
    | { singleSelectReply?: { selectedRowId?: string }; title?: string }
    | undefined;
  if (list?.singleSelectReply?.selectedRowId) {
    return String(list.singleSelectReply.selectedRowId);
  }
  if (list?.title) return String(list.title);

  const interactive = message.interactiveResponseMessage as
    | {
        nativeFlowResponseMessage?: { paramsJson?: string };
        body?: { text?: string };
      }
    | undefined;
  if (interactive?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const parsed = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson) as {
        id?: string;
        selectedId?: string;
      };
      if (parsed.id) return String(parsed.id);
      if (parsed.selectedId) return String(parsed.selectedId);
    } catch {}
  }
  if (interactive?.body?.text) return String(interactive.body.text);

  return "";
}

function collectMentionedJids(message: Record<string, unknown> | undefined): string[] {
  if (!message) return [];
  const out: string[] = [];
  const push = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const j of arr) {
      if (typeof j === "string" && j) out.push(j);
    }
  };

  const ext = message.extendedTextMessage as { contextInfo?: { mentionedJid?: string[] } } | undefined;
  push(ext?.contextInfo?.mentionedJid);
  const img = message.imageMessage as { contextInfo?: { mentionedJid?: string[] } } | undefined;
  push(img?.contextInfo?.mentionedJid);
  const vid = message.videoMessage as { contextInfo?: { mentionedJid?: string[] } } | undefined;
  push(vid?.contextInfo?.mentionedJid);
  const doc = message.documentMessage as { contextInfo?: { mentionedJid?: string[] } } | undefined;
  push(doc?.contextInfo?.mentionedJid);

  return out;
}

function quotedParticipant(message: Record<string, unknown> | undefined): string {
  if (!message) return "";
  for (const val of Object.values(message)) {
    if (val && typeof val === "object") {
      const ctx = (val as {
        contextInfo?: { participant?: string; remoteJid?: string; quotedMessage?: unknown };
      }).contextInfo;
      if (ctx?.participant) return String(ctx.participant);
      if (ctx?.quotedMessage && ctx.remoteJid) return String(ctx.remoteJid);
    }
  }
  return "";
}

/**
 * Geston-MD group gate: only respond when the bot is @mentioned or the user
 * is replying to a bot message. DMs always pass.
 */
export function isBotAddressed(opts: {
  isGroup: boolean;
  text: string;
  mentionedJids: string[];
  quotedParticipant: string;
  botIds: string[];
}): boolean {
  if (!opts.isGroup) return true;
  const botDigits = opts.botIds.map(digits).filter((d) => d.length >= 5);
  if (botDigits.length === 0) return false;

  const matchBot = (jidOrNum: string) => {
    const d = digits(jidOrNum);
    return d.length >= 5 && botDigits.some((b) => b === d || d.endsWith(b) || b.endsWith(d));
  };

  const body = String(opts.text || "");
  const mentionedInBody = botDigits.some((b) => body.includes("@" + b));
  const mentionedInList = opts.mentionedJids.some(matchBot);
  const replyToBot = matchBot(opts.quotedParticipant);

  return mentionedInBody || mentionedInList || replyToBot;
}

function botIdentityFromSock(sock: Sock): string[] {
  const ids: string[] = [];
  if (sock.user?.id) ids.push(sock.user.id);
  if (sock.user?.lid) ids.push(sock.user.lid);
  const envPhone = String(process.env.DEV_WA_NUMBER || "").replace(/\D/g, "");
  if (envPhone.length >= 8) ids.push(envPhone);
  return ids;
}

function stripBotMentions(text: string, botIds: string[]): string {
  let t = String(text || "");
  for (const id of botIds) {
    const d = digits(id);
    if (d.length >= 5) {
      t = t.replace(new RegExp("@" + d + "\\b", "gi"), " ");
    }
  }
  return t.replace(/\s+/g, " ").trim();
}

function isDevOwnerSender(senderJid: string): boolean {
  const dev = digits(process.env.DEV_WA_NUMBER || "");
  if (!dev || dev.length < 8) return false;
  const from = resolvePhoneNumber(senderJid) || digits(senderJid);
  if (!from || from.length < 8) return false;
  return from === dev;
}

/** Group AI reply (mention-gated). Replies into the group chat. */
async function replyGroupAi(
  chatJid: string,
  senderJid: string,
  text: string,
  botIds: string[]
): Promise<void> {
  const cleaned = stripBotMentions(text, botIds) || text;
  if (!cleaned) return;

  await sendWaTyping(chatJid, true);
  try {
    const owner = isDevOwnerSender(senderJid);
    const phone = resolvePhoneNumber(senderJid) || digits(senderJid);
    const result = await runAIChat({
      surface: "whatsapp",
      message: cleaned.slice(0, 2000),
      isOwner: owner,
      isUnrestricted: isTNumber(phone),
      userLabel: "wa-group:" + phone,
    });
    if (result.text) {
      await sendWaText(chatJid, result.text);
    }
  } catch (err) {
    logger.warn({ err }, "WhatsApp group AI reply failed");
    await sendWaText(
      chatJid,
      "Could not answer right now. Try again or DM me.\nShop: " + getSiteUrl()
    ).catch(() => {});
  } finally {
    await sendWaTyping(chatJid, false);
  }
}

export function attachMessageHandler(sock: Sock, publicHandler: () => PublicHandler | null): void {
  sock.ev.on("messages.upsert", async (...args: unknown[]) => {
    try {
      const payload = args[0] as {
        type?: string;
        messages?: Array<{
          key?: {
            id?: string | null;
            remoteJid?: string | null;
            remoteJidAlt?: string | null;
            participant?: string | null;
            participantAlt?: string | null;
            fromMe?: boolean | null;
          };
          message?: Record<string, unknown>;
        }>;
      };
      if (!payload?.messages?.length) return;
      if (payload.type && payload.type !== "notify") return;

      const handler = publicHandler();
      const botIds = botIdentityFromSock(sock);

      for (const m of payload.messages) {
        const key = m.key || {};
        const rawJid = key.remoteJid || "";
        if (!rawJid || isBroadcastOrStatus(rawJid)) continue;

        const isGroup = rawJid.endsWith("@g.us");
        const fromMe = !!key.fromMe;
        if (fromMe) continue;

        let sender = "";
        if (isGroup) {
          sender =
            resolveSenderJid({
              remoteJid: key.participant || key.remoteJid,
              remoteJidAlt: key.participantAlt || key.remoteJidAlt,
              participant: key.participant,
              participantAlt: key.participantAlt,
            }) ||
            key.participant ||
            key.participantAlt ||
            "";
        } else {
          sender =
            resolveSenderJid({
              remoteJid: key.remoteJid,
              remoteJidAlt: key.remoteJidAlt,
              participant: key.participant,
              participantAlt: key.participantAlt,
            }) || rawJid;
        }
        if (!sender) continue;

        // Already blocked in DB — ignore entirely
        if (await isContactBlocked(sender).catch(() => false)) continue;

        const text = extractText(m.message).trim();
        if (!text) continue;

        const mentionedJids = collectMentionedJids(m.message);
        const qPart = quotedParticipant(m.message);
        const isBotMentioned = isBotAddressed({
          isGroup,
          text,
          mentionedJids,
          quotedParticipant: qPart,
          botIds,
        });

        // Groups: only care about messages that address the bot
        if (isGroup && !isBotMentioned) continue;

        // ── Security (WA only): insults / bad words / spam / malware → block ──
        // Runs on all DMs + group messages that @mention / reply to the bot.
        // Owner/dev is never blocked (hard-gated inside maybeBlockAbusiveUser).
        const blocked = await maybeBlockAbusiveUser({
          sock,
          chatJid: rawJid,
          senderJid: sender,
          text,
          isGroup,
        }).catch((err) => {
          logger.warn({ err }, "maybeBlockAbusiveUser error");
          return false;
        });
        if (blocked) continue;

        // ── Groups: AI reply ──
        if (isGroup) {
          await replyGroupAi(rawJid, sender, text, botIds).catch((err) => {
            logger.warn({ err }, "group AI handler error");
          });
          continue;
        }

        // ── DMs: detect client device then public handler ──
        const msgId = key.id || "";
        await recordDeviceFromIncoming(rawJid, msgId).catch(() => {});

        const incoming: WaIncomingMessage = {
          jid: rawJid,
          sender,
          text,
          fromMe: false,
          isGroup: false,
          isBotMentioned: true,
          mentionedJids,
        };

        const ownerHandled = await maybeHandleOwnerTx(incoming).catch(() => false);
        if (ownerHandled) continue;

        if (!handler) continue;
        await handler(incoming).catch(() => {});
      }
    } catch (err) {
      logger.warn({ err }, "WhatsApp messages.upsert handler error");
    }
  });
}
