import { WaContact, type WaConsentStatus } from "../models/WaContact.js";
import { resolvePhoneNumber, getCachedUsername } from "../lib/waIdentity.js";

export const CONSENT_ACCEPT_ID = "consent_accept";
export const CONSENT_DECLINE_ID = "consent_decline";

export function consentPromptText(): string {
  return (
    "Welcome to Geston Hosting.\n\n" +
    "To use this assistant we need your consent to process your WhatsApp messages " +
    "for support and service requests.\n\n" +
    "Reply *Accept* to continue, or *Decline* to stop.\n\n" +
    "1. Accept\n" +
    "2. Decline"
  );
}

export function consentDeclinedText(): string {
  return (
    "You declined consent.\n\n" +
    "This bot will not save your messages or provide services.\n" +
    "Reply *Accept* anytime if you change your mind."
  );
}

/** Shown right after the user accepts consent — no menu buttons. */
export function consentAcceptedText(): string {
  return (
    "Thanks — you're all set.\n\n" +
    "How can I help you today?\n" +
    "Ask me anything about hosting, panels, boosting, or payments.\n\n" +
    "Tip: type *menu* anytime for quick options."
  );
}

export async function getConsentOnly(jid: string): Promise<WaConsentStatus | null> {
  const existing = await WaContact.findOne({ jid }).select("consentStatus").lean();
  if (!existing) return null;
  return (existing.consentStatus as WaConsentStatus) || "pending";
}

export async function findOrCreateContact(jid: string): Promise<{
  jid: string;
  phoneNumber: string;
  username: string;
  consentStatus: WaConsentStatus;
  isNew: boolean;
}> {
  const phoneNumber = resolvePhoneNumber(jid);
  const username = getCachedUsername(jid) || "";
  const existing = await WaContact.findOne({ jid }).lean();
  if (existing) {
    const status = (existing.consentStatus as WaConsentStatus) || "pending";
    if (status === "declined") {
      return {
        jid: existing.jid,
        phoneNumber: existing.phoneNumber || phoneNumber,
        username: existing.username || username,
        consentStatus: "declined",
        isNew: false,
      };
    }
    await WaContact.updateOne(
      { jid },
      {
        $set: {
          lastSeenAt: new Date(),
          ...(phoneNumber ? { phoneNumber } : {}),
          ...(username ? { username } : {}),
        },
        $inc: { messageCount: 1 },
      }
    );
    return {
      jid: existing.jid,
      phoneNumber: existing.phoneNumber || phoneNumber,
      username: existing.username || username,
      consentStatus: status,
      isNew: false,
    };
  }

  await WaContact.create({
    jid,
    phoneNumber,
    username,
    consentStatus: "pending",
    clientDevice: "unknown",
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    messageCount: 1,
  });

  return {
    jid,
    phoneNumber,
    username,
    consentStatus: "pending",
    isNew: true,
  };
}

export async function setConsentStatus(
  jid: string,
  status: WaConsentStatus
): Promise<void> {
  const phoneNumber = resolvePhoneNumber(jid);
  await WaContact.findOneAndUpdate(
    { jid },
    {
      $set: {
        consentStatus: status,
        lastSeenAt: new Date(),
        ...(phoneNumber ? { phoneNumber } : {}),
      },
      $setOnInsert: {
        jid,
        firstSeenAt: new Date(),
        messageCount: 0,
        username: getCachedUsername(jid) || "",
        clientDevice: "unknown",
      },
    },
    { upsert: true }
  );
}

export function isConsentAcceptText(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "accept" ||
    t === CONSENT_ACCEPT_ID ||
    t === "yes" ||
    t === "agree" ||
    t === "i accept" ||
    t === "1"
  );
}

export function isConsentDeclineText(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "decline" ||
    t === CONSENT_DECLINE_ID ||
    t === "no" ||
    t === "reject" ||
    t === "i decline" ||
    t === "2"
  );
}
