import { resolvePhoneNumber } from "../lib/waIdentity.js";
import { runOwnerAdminIntent } from "./bot/ownerOps.js";
import { sendWaText } from "./whatsappSend.js";
import type { WaIncomingMessage } from "./whatsappMessages.js";

function digitsOnly(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function getDevWaNumber(): string {
  return digitsOnly(process.env.DEV_WA_NUMBER || "");
}

function isDevOwner(msg: WaIncomingMessage): boolean {
  const dev = getDevWaNumber();
  if (!dev || dev.length < 8) return false;
  const from = resolvePhoneNumber(msg.jid) || digitsOnly(msg.jid.split("@")[0] || "");
  if (!from || from.length < 8) return false;
  return from === dev;
}

/**
 * Owner-only Coins / user lookup / stats. Returns true if the message was handled
 * (including error replies). Non-owners always get false — never leak capability.
 */
export async function maybeHandleOwnerTx(msg: WaIncomingMessage): Promise<boolean> {
  if (msg.fromMe || msg.isGroup) return false;
  if (!isDevOwner(msg)) return false;

  const raw = String(msg.text || "").trim();
  if (!raw) return false;

  const phone = resolvePhoneNumber(msg.jid) || digitsOnly(msg.jid.split("@")[0] || "");
  const op = await runOwnerAdminIntent(raw, "wa:" + phone);
  if (!op) return false;

  await sendWaText(msg.jid, op.ok ? op.message : "❌ " + op.error);
  return true;
}
