/**
 * Detect client platform from a WhatsApp message ID.
 * Mirrors @whiskeysockets/baileys getDevice() + safe fallbacks used by Geston-MD.
 */

export type WaClientDevice = "android" | "ios" | "web" | "desktop" | "unknown";

/**
 * Baileys encodes the sender device in the message key id.
 * Common rules (WhiskeySockets):
 *  - id length > 21 → android
 *  - starts with "3A" → ios
 *  - otherwise → web (includes desktop in older builds)
 */
export function detectDeviceFromMessageId(messageId: string | undefined | null): WaClientDevice {
  const id = String(messageId || "").trim();
  if (!id) return "unknown";

  try {
    // Primary algorithm (Baileys getDevice)
    if (id.length > 21) return "android";
    if (id.substring(0, 2) === "3A") return "ios";
    // Short non-3A ids are typically web/desktop clients
    if (id.startsWith("3EB0")) return "web";
    if (id.length <= 21) return "web";
  } catch {
    // fall through
  }

  // Explicit fallbacks (Geston-MD isbot.js)
  if (id.startsWith("3EB0")) return "web";
  if (id.startsWith("3A")) return "ios";
  if (id.length === 16 && id.startsWith("BAE5")) return "unknown"; // bot-like

  return "unknown";
}

/** Only pure Android clients reliably render interactive quick-reply buttons. */
export function canUseInteractiveButtons(device: WaClientDevice | string | null | undefined): boolean {
  return device === "android";
}

export function deviceLabel(device: WaClientDevice | string | null | undefined): string {
  switch (device) {
    case "android":
      return "Android";
    case "ios":
      return "iOS";
    case "web":
      return "Web";
    case "desktop":
      return "Desktop";
    default:
      return "Unknown";
  }
}
