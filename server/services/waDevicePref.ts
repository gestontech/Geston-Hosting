import { WaContact } from "../models/WaContact.js";
import {
  detectDeviceFromMessageId,
  canUseInteractiveButtons,
  type WaClientDevice,
} from "../lib/waDevice.js";
import { logger } from "../logger.js";

/** In-memory cache so every send doesn't hit Mongo */
const cache = new Map<string, WaClientDevice>();

export async function getStoredClientDevice(jid: string): Promise<WaClientDevice> {
  const key = String(jid || "");
  if (!key) return "unknown";
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const doc = await WaContact.findOne({ jid: key }).select("clientDevice").lean();
    const d = (doc as { clientDevice?: string } | null)?.clientDevice as WaClientDevice | undefined;
    const val: WaClientDevice =
      d === "android" || d === "ios" || d === "web" || d === "desktop" ? d : "unknown";
    cache.set(key, val);
    return val;
  } catch {
    return "unknown";
  }
}

export async function setClientDevice(jid: string, device: WaClientDevice): Promise<void> {
  if (!jid || device === "unknown") return;
  cache.set(jid, device);
  try {
    await WaContact.findOneAndUpdate(
      { jid },
      {
        $set: { clientDevice: device, lastSeenAt: new Date() },
        $setOnInsert: {
          jid,
          consentStatus: "pending",
          firstSeenAt: new Date(),
          messageCount: 0,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    logger.warn({ err, jid, device }, "failed to persist clientDevice");
  }
}

/**
 * Observe an incoming message id and lock the contact to that device when we
 * get a clear non-unknown signal. Once set to non-android, interactive is off
 * for that contact going forward.
 */
export async function recordDeviceFromIncoming(
  jid: string,
  messageId: string | undefined | null
): Promise<WaClientDevice> {
  const detected = detectDeviceFromMessageId(messageId);
  if (detected === "unknown") {
    return getStoredClientDevice(jid);
  }

  const existing = await getStoredClientDevice(jid);

  // First clear signal, or upgrade from android → ios/web/desktop
  if (existing === "unknown" || (existing === "android" && detected !== "android")) {
    await setClientDevice(jid, detected);
    return detected;
  }

  // Sticky: once non-android is stored, do not overwrite with android
  if (existing !== "android" && detected === "android") {
    return existing;
  }

  // Same or other concrete platform already stored — keep it
  return existing;
}

/**
 * Interactive quick-reply / CTA buttons ONLY for pure Android.
 * iOS, web, desktop, and unknown/unrecognized devices always get text menus.
 */
export async function shouldSendInteractive(jid: string): Promise<boolean> {
  const device = await getStoredClientDevice(jid);
  // Strict: unknown is NOT android → text only
  return canUseInteractiveButtons(device);
}

/** Test helper — clear in-memory device cache */
export function clearDeviceCacheForTests(): void {
  cache.clear();
}
