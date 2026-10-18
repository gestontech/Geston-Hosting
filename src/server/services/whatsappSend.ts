import { logger } from "../logger.js";
import { shouldSendInteractive } from "./waDevicePref.js";

export const WA_WATERMARK = "Powerd by GESTONX";
export const WA_WATERMARK_LINE = "\n\n> " + WA_WATERMARK;

type Sock = {
  sendMessage?: (
    jid: string,
    content: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => Promise<unknown>;
  sendPresenceUpdate?: (type: string, jid: string) => Promise<unknown>;
};

let getSock: () => Sock | null = () => null;

export function registerWaSendSock(getter: () => Sock | null): void {
  getSock = getter;
}

export function setWaSendSock(sock: Sock | null): void {
  getSock = () => sock;
}

function stripWatermark(text: string): string {
  let t = String(text || "");
  t = t.replace(/\n\n> Powerd by GESTONX\s*$/g, "");
  t = t.replace(/\n> Powerd by GESTONX\s*$/g, "");
  t = t.replace(/Powerd by GESTONX\s*$/g, "");
  return t.trimEnd();
}

function withTextWatermark(text: string): string {
  return stripWatermark(text) + WA_WATERMARK_LINE;
}

/**
 * Fake quoted "Verified" message + high forward score.
 * Applied only to plain text (not interactive button messages).
 */
export function buildVerifiedQuote(recipientJid?: string): Record<string, unknown> {
  const mentioned = recipientJid ? [String(recipientJid)] : [];
  return {
    key: {
      remoteJid: "0@s.whatsapp.net",
      fromMe: false,
      id: "VERIFIED" + Date.now().toString(36).toUpperCase(),
      participant: "0@s.whatsapp.net",
    },
    message: {
      conversation: "Verified",
    },
    participant: "0@s.whatsapp.net",
    messageTimestamp: Math.floor(Date.now() / 1000),
    _mentionJids: mentioned,
  };
}

function verifiedTextPayload(text: string, jid: string): Record<string, unknown> {
  return {
    text,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      mentionedJid: [jid],
    },
  };
}

function verifiedSendOptions(jid: string): Record<string, unknown> {
  return { quoted: buildVerifiedQuote(jid) };
}

/** Show or hide the WhatsApp "typing…" indicator for a chat. */
export async function sendWaTyping(jid: string, composing: boolean): Promise<void> {
  const sock = getSock();
  if (!sock?.sendPresenceUpdate) return;
  try {
    await sock.sendPresenceUpdate(composing ? "composing" : "paused", jid);
  } catch {
    // cosmetic only
  }
}

export async function sendWaText(jid: string, text: string): Promise<boolean> {
  const sock = getSock();
  if (!sock?.sendMessage) return false;
  const body = withTextWatermark(text);
  try {
    await sock.sendMessage(jid, verifiedTextPayload(body, jid), verifiedSendOptions(jid));
    return true;
  } catch (err) {
    try {
      await sock.sendMessage(jid, { text: body });
      return true;
    } catch (err2) {
      logger.warn({ err: err2, jid }, "WhatsApp sendMessage failed");
      return false;
    }
  }
}

/** Full-featured text menu when interactive buttons are unavailable (iOS/web/desktop). */
function buttonsAsText(body: string, buttons: Array<{ id: string; text: string }>): string {
  const lines = [stripWatermark(body), ""];
  lines.push("Reply with a number or the option name:");
  buttons.forEach((b, i) => {
    lines.push(String(i + 1) + ". " + b.text);
  });
  return lines.join("\n");
}

export async function sendWaQuickReplies(
  jid: string,
  text: string,
  buttons: Array<{ id: string; text: string }>
): Promise<boolean> {
  const sock = getSock();
  if (!sock?.sendMessage) return false;

  const body = stripWatermark(text);
  const allowInteractive = await shouldSendInteractive(jid);

  if (!allowInteractive) {
    // Strict text mode for non-Android — same options, no buttons
    return sendWaText(jid, buttonsAsText(body, buttons));
  }

  const interactivePayload: Record<string, unknown> = {
    text: body,
    footer: WA_WATERMARK,
    interactiveButtons: buttons.map((b) => ({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: b.text,
        id: b.id,
      }),
    })),
  };

  try {
    await sock.sendMessage(jid, interactivePayload);
    return true;
  } catch (err) {
    logger.warn({ err, jid }, "interactiveButtons send failed, trying legacy buttons");
  }

  try {
    const legacy: Record<string, unknown> = {
      text: body,
      footer: WA_WATERMARK,
      buttons: buttons.map((b) => ({
        buttonId: b.id,
        buttonText: { displayText: b.text },
        type: 1,
      })),
      headerType: 1,
    };
    await sock.sendMessage(jid, legacy);
    return true;
  } catch (err) {
    logger.warn({ err, jid }, "legacy buttons failed, falling back to text");
  }

  return sendWaText(jid, buttonsAsText(body, buttons));
}

export async function sendWaCtaUrl(
  jid: string,
  text: string,
  displayText: string,
  url: string
): Promise<boolean> {
  const sock = getSock();
  if (!sock?.sendMessage) return false;

  const body = stripWatermark(text);
  const allowInteractive = await shouldSendInteractive(jid);

  if (!allowInteractive) {
    return sendWaText(jid, body + "\n\n" + displayText + ":\n" + url);
  }

  const payload: Record<string, unknown> = {
    text: body,
    footer: WA_WATERMARK,
    interactiveButtons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: displayText,
          url,
          merchant_url: url,
        }),
      },
    ],
  };

  try {
    await sock.sendMessage(jid, payload);
    return true;
  } catch (err) {
    logger.warn({ err, jid }, "cta_url send failed, falling back to text link");
  }

  return sendWaText(jid, body + "\n\n" + displayText + ":\n" + url);
}
