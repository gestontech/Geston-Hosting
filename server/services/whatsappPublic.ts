import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import { Panel } from "../models/Panel.js";
import { Transaction } from "../models/Transaction.js";
import { logger } from "../logger.js";
import {
  isServiceDisabled,
  getDisabledServices,
  getDisabledPaymentMethods,
  setDisabledServices,
  setDisabledPaymentMethods,
} from "../lib/featureFlags.js";
import {
  setPublicMessageHandler,
  getActiveWaSock,
  type WaIncomingMessage,
} from "./whatsappOwner.js";
import { sendWaText, sendWaQuickReplies, sendWaCtaUrl, sendWaTyping } from "./whatsappSend.js";
import {
  findOrCreateContact,
  getConsentOnly,
  setConsentStatus,
  consentPromptText,
  consentDeclinedText,
  consentAcceptedText,
  isConsentAcceptText,
  isConsentDeclineText,
  CONSENT_ACCEPT_ID,
  CONSENT_DECLINE_ID,
} from "./waConsent.js";
import {
  userMenuButtons,
  adminMenuButtons,
  menuIntroText,
  buildPlansText,
  mapMenuButtonId,
} from "./waMenus.js";
import {
  contactDeveloperText,
  developerWaMeUrl,
  isContactDeveloperIntent,
} from "./waContactDev.js";
import { resolvePhoneNumber } from "../lib/waIdentity.js";
import { isTNumber } from "../lib/tNumbers.js";
import { getSiteUrl, getPanelShopUrl, getBoostShopUrl } from "../lib/siteUrl.js";
import {
  listBoostPlatforms,
  listBoostServiceTypes,
  listBoostServicesForType,
  getBoostServiceByProviderId,
  formatBoostServiceDetail,
  buildBoostPlatformIntro,
  boostPlatformCb,
  boostTypeCb,
  boostServiceCb,
  parseBoostPlatformCb,
  parseBoostTypeCb,
  parseBoostServiceCb,
  platformLabel,
  shortServiceButtonLabel,
  type BoostPlatform,
} from "./boostMenus.js";
import { runAIChat } from "./aiChat.js";
import { unbanWaContact } from "./waSecurity.js";

const SERVICE_KEYS = ["panels", "boost", "botDeploy"] as const;
const PAYMENT_KEYS = [
  "kenya",
  "nigeria",
  "cameroon",
  "tanzania",
  "drc",
  "southAfrica",
  "ghana",
  "paypal",
  "card",
] as const;

/** Short replies that must NEVER trigger menus/boost — go to AI instead. */
const ACK_OR_FILLER = new Set([
  "ok",
  "okay",
  "k",
  "kk",
  "okie",
  "okey",
  "thanks",
  "thank you",
  "thx",
  "ty",
  "cool",
  "nice",
  "sure",
  "yeah",
  "yep",
  "yup",
  "yea",
  "alr",
  "alright",
  "fine",
  "noted",
  "got it",
  "gotit",
  "done",
  "great",
  "perfect",
  "bet",
  "np",
  "no problem",
  "hmm",
  "hm",
  "mhm",
  "lol",
  "lmao",
  "haha",
  "hahaha",
]);

/** Explicit platform aliases only (no substring matching). */
const PLATFORM_ALIASES: Record<string, string> = {
  twitter: "x",
  "x twitter": "x",
  ig: "instagram",
  insta: "instagram",
  yt: "youtube",
  fb: "facebook",
  tt: "tiktok",
  "tik tok": "tiktok",
};

function digitsOnly(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function getDevWaNumber(): string {
  return digitsOnly(process.env.DEV_WA_NUMBER || "");
}

function isGroupOrBroadcastJid(jid: string): boolean {
  const j = String(jid || "").toLowerCase();
  return (
    j.endsWith("@g.us") ||
    j.endsWith("@broadcast") ||
    j.endsWith("@newsletter") ||
    j === "status@broadcast"
  );
}

function phoneFromMsg(msg: WaIncomingMessage): string {
  return resolvePhoneNumber(msg.jid) || digitsOnly(msg.jid.split("@")[0] || "");
}

function isDevOwner(msg: WaIncomingMessage): boolean {
  const dev = getDevWaNumber();
  if (!dev || dev.length < 8) return false;
  const from = phoneFromMsg(msg);
  if (!from || from.length < 8) return false;
  return from === dev;
}

function isAckOrFiller(lower: string): boolean {
  const t = lower.trim().replace(/[!?.]+$/g, "").trim();
  return ACK_OR_FILLER.has(t);
}

/** Exact id/label or known alias — never substring ("ok" must not hit TikTok). */
function matchBoostPlatform(
  lower: string,
  platforms: BoostPlatform[]
): BoostPlatform | null {
  const t = lower.trim().toLowerCase();
  if (!t || t.length < 2) return null;
  if (isAckOrFiller(t)) return null;

  const byId = platforms.find((p) => p.id === t);
  if (byId) return byId;

  const byLabel = platforms.find((p) => p.label.toLowerCase() === t);
  if (byLabel) return byLabel;

  const aliasId = PLATFORM_ALIASES[t];
  if (aliasId) {
    const byAlias = platforms.find((p) => p.id === aliasId);
    if (byAlias) return byAlias;
  }

  return null;
}

async function sendMainMenu(msg: WaIncomingMessage): Promise<void> {
  const admin = isDevOwner(msg);
  const buttons = admin ? adminMenuButtons() : userMenuButtons();
  const text = menuIntroText(admin);
  const ok = await sendWaQuickReplies(msg.jid, text, buttons);
  if (!ok) {
    await sendWaText(
      msg.jid,
      text + "\n\n" + buttons.map((b) => "- " + b.text).join("\n")
    );
  }
}

async function sendContactDeveloper(jid: string): Promise<void> {
  const url = developerWaMeUrl();
  const body = contactDeveloperText();
  if (!url) {
    await sendWaText(jid, body);
    return;
  }
  const ok = await sendWaCtaUrl(jid, body, "Contact Developer", url);
  if (!ok) {
    await sendWaText(jid, body);
  }
}

async function statsText(): Promise<string> {
  const SITE_URL = getSiteUrl();
  try {
    const [totalUsers, activeBots, totalBots, totalPanels, recentTx] = await Promise.all([
      User.countDocuments(),
      Bot.countDocuments({ status: "running" }),
      Bot.countDocuments({ status: { $ne: "deleted" } }),
      Panel.countDocuments(),
      Transaction.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: "success",
        type: "topup",
      }),
    ]);
    return (
      "Geston Host Stats\n\n" +
      "Users: " +
      String(totalUsers) +
      "\n" +
      "Active bots: " +
      String(activeBots) +
      "\n" +
      "Total bots: " +
      String(totalBots) +
      "\n" +
      "Panels: " +
      String(totalPanels) +
      "\n" +
      "Payments (24h): " +
      String(recentTx) +
      "\n\nShop: " +
      SITE_URL
    );
  } catch {
    return "Failed to fetch stats. Try again later.";
  }
}

async function buyText(): Promise<string> {
  const SITE_URL = getSiteUrl();
  if (await isServiceDisabled("panels")) {
    return "Panel shop is temporarily disabled.\n\nShop: " + SITE_URL;
  }
  return (
    "Buy Panel\n\n" +
    "Website:\n  " +
    getPanelShopUrl() +
    "\n\n" +
    "Reply plans to see live prices."
  );
}

async function listFlagsText(): Promise<string> {
  const [services, payments] = await Promise.all([
    getDisabledServices(),
    getDisabledPaymentMethods(),
  ]);
  const svcLines = SERVICE_KEYS.map(
    (k) => k + ": " + (services.includes(k) ? "DISABLED" : "enabled")
  );
  const payLines = PAYMENT_KEYS.map(
    (k) => k + ": " + (payments.includes(k) ? "DISABLED" : "enabled")
  );
  return (
    "Feature Flags\n\nServices:\n" +
    svcLines.join("\n") +
    "\n\nPayments:\n" +
    payLines.join("\n") +
    "\n\nCommands:\ndisable / enable <panels|boost|botDeploy>\ndisablepay / enablepay <kenya|card|...>\nflags\n.unban <phone>"
  );
}

async function sendConsentPrompt(jid: string): Promise<void> {
  const body = consentPromptText();
  const sent = await sendWaQuickReplies(jid, body, [
    { id: CONSENT_ACCEPT_ID, text: "Accept" },
    { id: CONSENT_DECLINE_ID, text: "Decline" },
  ]);
  if (!sent) {
    await sendWaText(jid, body + "\n\nReply Accept or Decline.");
  }
}

async function handleConsentGate(msg: WaIncomingMessage): Promise<boolean> {
  if (isDevOwner(msg)) {
    await setConsentStatus(msg.jid, "accepted");
    return false;
  }

  const lower = msg.text.trim().toLowerCase();
  const existingStatus = await getConsentOnly(msg.jid);

  if (existingStatus === "declined") {
    if (isConsentAcceptText(lower)) {
      await setConsentStatus(msg.jid, "accepted");
      await sendWaText(msg.jid, consentAcceptedText());
      return true;
    }
    await sendWaText(msg.jid, consentDeclinedText());
    return true;
  }

  if (isConsentAcceptText(lower)) {
    await setConsentStatus(msg.jid, "accepted");
    await sendWaText(msg.jid, consentAcceptedText());
    return true;
  }

  if (isConsentDeclineText(lower)) {
    await setConsentStatus(msg.jid, "declined");
    await sendWaText(msg.jid, consentDeclinedText());
    return true;
  }

  if (existingStatus === "accepted") {
    return false;
  }

  const contact = await findOrCreateContact(msg.jid);
  if (contact.consentStatus === "pending" || contact.isNew) {
    await sendConsentPrompt(msg.jid);
    return true;
  }

  return false;
}

async function handleOwnerAdmin(msg: WaIncomingMessage, lower: string): Promise<boolean> {
  if (!isDevOwner(msg)) return false;

  if (lower === "flags" || lower === "menu_flags") {
    await sendWaText(msg.jid, await listFlagsText());
    return true;
  }

  // .unban / unban <number> — digits auto-cleaned
  const unbanMatch = lower.match(/^[.\/]?unban\s+(.+)$/);
  if (unbanMatch) {
    const result = await unbanWaContact(unbanMatch[1], getActiveWaSock());
    await sendWaText(msg.jid, result.ok ? "✅ " + result.message : "❌ " + result.message);
    return true;
  }

  const disableMatch = lower.match(/^disable\s+(\w+)$/);
  if (disableMatch) {
    const key = disableMatch[1];
    if (!(SERVICE_KEYS as readonly string[]).includes(key)) {
      await sendWaText(msg.jid, "Usage: disable <panels|boost|botDeploy>");
      return true;
    }
    const current = await getDisabledServices();
    if (!current.includes(key)) current.push(key);
    await setDisabledServices(current);
    await sendWaText(msg.jid, key + " is now DISABLED.");
    return true;
  }

  const enableMatch = lower.match(/^enable\s+(\w+)$/);
  if (enableMatch) {
    const key = enableMatch[1];
    if (!(SERVICE_KEYS as readonly string[]).includes(key)) {
      await sendWaText(msg.jid, "Usage: enable <panels|boost|botDeploy>");
      return true;
    }
    const current = await getDisabledServices();
    await setDisabledServices(current.filter((k) => k !== key));
    await sendWaText(msg.jid, key + " is now ENABLED.");
    return true;
  }

  const disablePayMatch = lower.match(/^disablepay\s+(\w+)$/);
  if (disablePayMatch) {
    const key = disablePayMatch[1];
    if (!(PAYMENT_KEYS as readonly string[]).includes(key)) {
      await sendWaText(
        msg.jid,
        "Usage: disablepay <kenya|nigeria|cameroon|tanzania|drc|southAfrica|ghana|paypal|card>"
      );
      return true;
    }
    const current = await getDisabledPaymentMethods();
    if (!current.includes(key)) current.push(key);
    await setDisabledPaymentMethods(current);
    await sendWaText(msg.jid, key + " payment is now DISABLED.");
    return true;
  }

  const enablePayMatch = lower.match(/^enablepay\s+(\w+)$/);
  if (enablePayMatch) {
    const key = enablePayMatch[1];
    if (!(PAYMENT_KEYS as readonly string[]).includes(key)) {
      await sendWaText(
        msg.jid,
        "Usage: enablepay <kenya|nigeria|cameroon|tanzania|drc|southAfrica|ghana|paypal|card>"
      );
      return true;
    }
    const current = await getDisabledPaymentMethods();
    await setDisabledPaymentMethods(current.filter((k) => k !== key));
    await sendWaText(msg.jid, key + " payment is now ENABLED.");
    return true;
  }

  return false;
}

async function sendBoostPlatforms(jid: string): Promise<void> {
  if (await isServiceDisabled("boost")) {
    await sendWaText(jid, "Social media boosting is temporarily disabled.\n\nShop: " + getSiteUrl());
    return;
  }
  const platforms = await listBoostPlatforms();
  if (platforms.length === 0) {
    await sendWaText(
      jid,
      "No boost services available right now.\n\nOrder on the website:\n" + getBoostShopUrl()
    );
    return;
  }
  const intro = await buildBoostPlatformIntro();
  const buttons = platforms.slice(0, 12).map((p) => ({
    id: boostPlatformCb(p.id),
    text: p.label,
  }));
  const ok = await sendWaQuickReplies(jid, intro, buttons);
  if (!ok) {
    await sendWaText(
      jid,
      intro +
        "\n\n" +
        platforms.map((p) => "- " + p.label + " (" + p.count + ")").join("\n") +
        "\n\nType a platform name e.g. tiktok"
    );
  }
}

async function sendBoostTypes(jid: string, platformId: string): Promise<void> {
  const types = await listBoostServiceTypes(platformId);
  if (types.length === 0) {
    await sendWaText(
      jid,
      "No services for " +
        platformLabel(platformId) +
        " right now.\n\n" +
        getBoostShopUrl()
    );
    return;
  }

  if (types.length === 1) {
    await sendBoostServicesForType(jid, platformId, types[0].id, types[0].label);
    return;
  }

  const body =
    platformLabel(platformId) +
    "\n\nPick a service type:";
  const buttons = types.slice(0, 12).map((t) => ({
    id: boostTypeCb(platformId, t.id),
    text: shortServiceButtonLabel(t.label, 22),
  }));
  const ok = await sendWaQuickReplies(jid, body, buttons);
  if (!ok) {
    await sendWaText(
      jid,
      body +
        "\n\n" +
        types.map((t) => "- " + t.label + " (" + t.count + ")").join("\n")
    );
  }
}

async function sendBoostServicesForType(
  jid: string,
  platformId: string,
  typeSlug: string,
  typeLabel?: string
): Promise<void> {
  const services = await listBoostServicesForType(platformId, typeSlug, 12);
  if (services.length === 0) {
    await sendWaText(
      jid,
      "No " +
        (typeLabel || typeSlug) +
        " services for " +
        platformLabel(platformId) +
        ".\n\n" +
        getBoostShopUrl()
    );
    return;
  }
  const label = typeLabel || services[0].serviceType || typeSlug;
  const body =
    platformLabel(platformId) +
    " · " +
    label +
    "\n\nCheapest first — tap for price & limits:\n\nOrder: " +
    getBoostShopUrl();
  const buttons = services.map((s) => ({
    id: boostServiceCb(s.providerId),
    text: shortServiceButtonLabel(
      s.name + " · " + s.baseKesPer1000 + "/1k",
      28
    ),
  }));
  const ok = await sendWaQuickReplies(jid, body, buttons);
  if (!ok) {
    await sendWaText(
      jid,
      body +
        "\n\n" +
        services
          .map(
            (s) =>
              "- " +
              s.name +
              " · " +
              s.baseKesPer1000 +
              " KSH/1k · min " +
              s.min
          )
          .join("\n")
    );
  }
}

async function handleBoostFlow(msg: WaIncomingMessage, raw: string, action: string): Promise<boolean> {
  const svcId = parseBoostServiceCb(raw) || parseBoostServiceCb(action);
  if (svcId !== null) {
    const svc = await getBoostServiceByProviderId(svcId);
    if (!svc) {
      await sendWaText(msg.jid, "Service not found. Try boost again.");
      return true;
    }
    await sendWaText(msg.jid, formatBoostServiceDetail(svc));
    return true;
  }

  const typeFromCb = parseBoostTypeCb(raw) || parseBoostTypeCb(action);
  if (typeFromCb) {
    await sendBoostServicesForType(msg.jid, typeFromCb.platformId, typeFromCb.typeSlug);
    return true;
  }

  const platFromCb = parseBoostPlatformCb(raw) || parseBoostPlatformCb(action);
  if (platFromCb) {
    await sendBoostTypes(msg.jid, platFromCb);
    return true;
  }

  if (action === "boost") {
    await sendBoostPlatforms(msg.jid);
    return true;
  }

  const lower = raw.trim().toLowerCase();
  if (isAckOrFiller(lower)) return false;

  const platforms = await listBoostPlatforms();
  const hit = matchBoostPlatform(lower, platforms);
  if (hit) {
    await sendBoostTypes(msg.jid, hit.id);
    return true;
  }

  return false;
}

async function replyWithAI(msg: WaIncomingMessage, raw: string): Promise<void> {
  try {
    const owner = isDevOwner(msg);
    const phone = phoneFromMsg(msg);
    const unrestricted = isTNumber(phone);
    const result = await runAIChat({
      surface: "whatsapp",
      message: raw.slice(0, 2000),
      isOwner: owner,
      isUnrestricted: unrestricted,
      userLabel: "wa:" + phone,
    });
    if (result.text) await sendWaText(msg.jid, result.text);
  } catch (err) {
    logger.warn({ err }, "WhatsApp AI reply failed");
    await sendWaText(
      msg.jid,
      "I could not answer that right now. Try menu · plans · boost · contact\nShop: " + getSiteUrl()
    );
  }
}

async function handlePublicMessageInner(msg: WaIncomingMessage): Promise<void> {
  if (msg.fromMe) return;
  if (msg.isGroup) return;
  if (isGroupOrBroadcastJid(msg.jid)) return;

  const raw = msg.text.trim();
  if (!raw) return;
  const lower = raw.toLowerCase();
  const SITE_URL = getSiteUrl();

  if (await handleOwnerAdmin(msg, lower)) return;
  if (await handleConsentGate(msg)) return;

  if (
    /^(disable|enable|disablepay|enablepay|flags)\b/.test(lower) &&
    !isDevOwner(msg)
  ) {
    return;
  }

  if (isAckOrFiller(lower)) {
    await replyWithAI(msg, raw);
    return;
  }

  const mapped = mapMenuButtonId(lower) || mapMenuButtonId(raw);
  const action = mapped || lower;

  if (await handleBoostFlow(msg, raw, action)) return;

  if (
    action === "menu" ||
    action === "help" ||
    action === "start" ||
    lower === "?" ||
    lower === "commands" ||
    lower === "options"
  ) {
    await sendMainMenu(msg);
    return;
  }

  if (
    /^(hi|hello|hey|hola|hallo|yo|sup|howdy|good\s*(morning|afternoon|evening)|hi geston|hello geston)\b/i.test(
      lower
    ) ||
    lower.startsWith("hi ") ||
    lower.startsWith("hello ") ||
    lower.startsWith("hey ")
  ) {
    await replyWithAI(msg, raw);
    return;
  }

  if (action === "plans") {
    await sendWaText(msg.jid, await buildPlansText());
    return;
  }

  if (action === "stats") {
    if (!isDevOwner(msg)) {
      await sendMainMenu(msg);
      return;
    }
    await sendWaText(msg.jid, await statsText());
    return;
  }

  if (action === "buy") {
    await sendWaText(msg.jid, await buyText());
    return;
  }

  if (action === "contact" || isContactDeveloperIntent(raw)) {
    await sendContactDeveloper(msg.jid);
    return;
  }

  if (action === "flags" && isDevOwner(msg)) {
    await sendWaText(msg.jid, await listFlagsText());
    return;
  }

  if (lower === "deploy" || lower === "bot deploy" || lower === "deploy bot") {
    if (await isServiceDisabled("botDeploy")) {
      await sendWaText(msg.jid, "Bot deployment is temporarily disabled.");
      return;
    }
    await sendWaText(
      msg.jid,
      "Deploy WhatsApp bots from the website.\n\n" + SITE_URL + "/deploy"
    );
    return;
  }

  await replyWithAI(msg, raw);
}

async function handlePublicMessage(msg: WaIncomingMessage): Promise<void> {
  if (msg.fromMe) return;
  if (msg.isGroup) return;
  if (isGroupOrBroadcastJid(msg.jid)) return;
  if (!msg.text.trim()) return;

  await sendWaTyping(msg.jid, true);
  try {
    await handlePublicMessageInner(msg);
  } finally {
    await sendWaTyping(msg.jid, false);
  }
}

export function startWhatsAppPublicBot(): void {
  setPublicMessageHandler(handlePublicMessage);
  if (!getDevWaNumber()) {
    logger.warn("DEV_WA_NUMBER not set — WhatsApp owner admin commands disabled");
  }
  logger.info("WhatsApp public bot handler registered");
}
