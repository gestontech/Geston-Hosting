import { logger } from "../logger.js";
import { registerCriticalNotifier } from "./notify.js";
import { startWhatsAppPublicBot } from "./whatsappPublic.js";
import { tryAutoReconnect } from "./whatsappOwner.js";
import { sendWaText } from "./whatsappSend.js";

function digitsOnly(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

export function startBot(): void {
  startWhatsAppPublicBot();

  // All owner notifications → owner WhatsApp (DEV_WA_NUMBER)
  registerCriticalNotifier(async (msg: string) => {
    const dev = digitsOnly(process.env.DEV_WA_NUMBER || "");
    if (!dev || dev.length < 8) return;
    const jid = dev + "@s.whatsapp.net";
    await sendWaText(jid, "🚨 Geston Hosting alert\n\n" + msg).catch(() => {});
  });

  const ownerId = String(process.env.BOT_OWNER_ID || "").trim();
  if (ownerId) {
    tryAutoReconnect(ownerId).catch((err) => {
      logger.warn({ err }, "WhatsApp auto-reconnect on boot failed");
    });
  }

  logger.info("WhatsApp bot services started");
}
