/**
 * Detect client platform from a WhatsApp message ID.
 * Mirrors @whiskeysockets/baileys getDevice() + safe fallbacks used by Geston-MD.
 */

export type WaClientDevice =
  | "android"
  | "ios"
  | "web"
  | "desktop"
  | "unknown";

/**
 * Baileys encodes the sender device in the message key id.
 *
 * Common rules:
 *  - id length > 21 → android
 *  - starts with "3A" → ios
 *  - starts with "3EB0" → web
 *
 * Some short BAE5 identifiers are bot-like identifiers and should
 * remain unknown instead of being classified as web.
 */
export function detectDeviceFromMessageId(
  messageId: string | undefined | null,
): WaClientDevice {
  const id = String(messageId || "").trim();

  if (!id) {
    return "unknown";
  }

  try {
    /*
     * Explicit bot-like identifier.
     *
     * This must be checked before the generic short-ID fallback,
     * otherwise a 16-character BAE5 identifier would incorrectly
     * become "web".
     */
    if (id.length === 16 && id.startsWith("BAE5")) {
      return "unknown";
    }

    /*
     * Primary Android detection.
     */
    if (id.length > 21) {
      return "android";
    }

    /*
     * iOS message identifiers.
     */
    if (id.startsWith("3A")) {
      return "ios";
    }

    /*
     * WhatsApp Web identifiers.
     */
    if (id.startsWith("3EB0")) {
      return "web";
    }

    /*
     * Short identifiers historically used by web/desktop clients.
     */
    if (id.length <= 21) {
      return "web";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

/**
 * Only pure Android clients reliably render interactive
 * quick-reply buttons.
 */
export function canUseInteractiveButtons(
  device: WaClientDevice | string | null | undefined,
): boolean {
  return device === "android";
}

export function deviceLabel(
  device: WaClientDevice | string | null | undefined,
): string {
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
