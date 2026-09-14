import { askAI, parseAIReply } from "../lib/ai.js";
import { buildPromptContext } from "../lib/promptContext.js";
import { appendMemory, formatMemoryForPrompt } from "../lib/aiMemory.js";
import { buildWhatsAppPrompt } from "../prompts/whatsappPrompt.js";
import { buildSitePrompt } from "../prompts/sitePrompt.js";
import { notifyOwnerRoutine } from "./notify.js";
import { logger } from "../logger.js";
import {
  ownerGrantTxByEmail,
  ownerSubtractTxByEmail,
  ownerLookupUserByEmail,
  ownerPlatformStats,
} from "./bot/ownerOps.js";
import { deployBotForAdmin } from "./ownerDeploy.js";
import {
  getDisabledServices,
  getDisabledPaymentMethods,
  setDisabledServices,
  setDisabledPaymentMethods,
} from "../lib/featureFlags.js";
import { unbanWaContact } from "./waSecurity.js";
import { getActiveWaSock } from "./whatsappOwner.js";

export type AISurface = "whatsapp" | "site";

export interface AIChatResult {
  text: string;
  requestLiveAgent: boolean;
  deployRequest: ReturnType<typeof parseAIReply>["deployRequest"];
}

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

async function runFlagAdmin(
  action: string,
  keyRaw?: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (action === "flags") {
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
    return {
      ok: true,
      message:
        "Feature Flags\n\nServices:\n" +
        svcLines.join("\n") +
        "\n\nPayments:\n" +
        payLines.join("\n"),
    };
  }

  const key = String(keyRaw || "").trim();
  if (!key) return { ok: false, error: "Missing flag key." };

  if (action === "disable") {
    if (!(SERVICE_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: "Usage key: panels | boost | botDeploy" };
    }
    const current = await getDisabledServices();
    if (!current.includes(key)) current.push(key);
    await setDisabledServices(current);
    return { ok: true, message: key + " is now DISABLED." };
  }
  if (action === "enable") {
    if (!(SERVICE_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: "Usage key: panels | boost | botDeploy" };
    }
    const current = await getDisabledServices();
    await setDisabledServices(current.filter((k) => k !== key));
    return { ok: true, message: key + " is now ENABLED." };
  }
  if (action === "disablepay") {
    if (!(PAYMENT_KEYS as readonly string[]).includes(key)) {
      return {
        ok: false,
        error: "Usage key: kenya|nigeria|cameroon|tanzania|drc|southAfrica|ghana|paypal|card",
      };
    }
    const current = await getDisabledPaymentMethods();
    if (!current.includes(key)) current.push(key);
    await setDisabledPaymentMethods(current);
    return { ok: true, message: key + " payment is now DISABLED." };
  }
  if (action === "enablepay") {
    if (!(PAYMENT_KEYS as readonly string[]).includes(key)) {
      return {
        ok: false,
        error: "Usage key: kenya|nigeria|cameroon|tanzania|drc|southAfrica|ghana|paypal|card",
      };
    }
    const current = await getDisabledPaymentMethods();
    await setDisabledPaymentMethods(current.filter((k) => k !== key));
    return { ok: true, message: key + " payment is now ENABLED." };
  }
  return { ok: false, error: "Unknown flag action." };
}

export async function runAIChat(opts: {
  surface: AISurface;
  message: string;
  isOwner: boolean;
  /** T_NUMBERS — answer any topic; still not owner admin. */
  isUnrestricted?: boolean;
  userLabel?: string;
}): Promise<AIChatResult> {
  const isUnrestricted = !!opts.isUnrestricted;
  const userLabel = opts.userLabel || "";
  const ctx = await buildPromptContext(opts.isOwner, isUnrestricted);
  const systemPrompt = opts.surface === "whatsapp" ? buildWhatsAppPrompt(ctx) : buildSitePrompt(ctx);

  const memoryPrefix = userLabel ? formatMemoryForPrompt(userLabel) : "";
  const messageForModel = memoryPrefix
    ? memoryPrefix + opts.message.slice(0, 2000)
    : opts.message.slice(0, 2000);

  if (userLabel) appendMemory(userLabel, "user", opts.message);

  const raw = await askAI(messageForModel, systemPrompt);
  const parsed = parseAIReply(raw);

  if (parsed.requestLiveAgent && opts.surface === "site") {
    const who = userLabel || "unknown user";
    await notifyOwnerRoutine(
      `🆘 Live agent requested (${opts.surface})\nFrom: ${who}\nMessage: ${opts.message.slice(0, 500)}\nReach out to them directly via Contact.`
    ).catch(() => {});
  }

  if (parsed.deployRequest && opts.isOwner) {
    const d = parsed.deployRequest;
    const actor = (userLabel || opts.surface) + ":ai";
    try {
      const result = await deployBotForAdmin({
        appName: d.appName,
        sessionVar: d.sessionVar,
        device: d.device,
        isTrial: d.isTrial,
        months: d.months,
        actorLabel: actor,
      });
      const deployText = result.ok
        ? result.message
        : "❌ Deploy failed: " + result.error;
      const combined =
        parsed.text &&
        parsed.text.length < 300 &&
        !/don't have|no access|cannot|can't/i.test(parsed.text)
          ? parsed.text + "\n\n" + deployText
          : deployText;
      if (userLabel) appendMemory(userLabel, "assistant", combined);
      return {
        text: combined,
        requestLiveAgent: parsed.requestLiveAgent,
        deployRequest: parsed.deployRequest,
      };
    } catch (err) {
      logger.warn({ err, appName: d.appName }, "AI owner deploy failed");
      const fail = "❌ Deploy failed unexpectedly. Check logs / HEROKU_API_KEY.";
      if (userLabel) appendMemory(userLabel, "assistant", fail);
      return {
        text: fail,
        requestLiveAgent: parsed.requestLiveAgent,
        deployRequest: parsed.deployRequest,
      };
    }
  }

  if (parsed.deployRequest && !opts.isOwner) {
    logger.warn(
      { surface: opts.surface, userLabel },
      "AI emitted DEPLOY_BOT for non-owner — ignored"
    );
  }

  if (parsed.ownerAdminRequest && opts.isOwner) {
    const req = parsed.ownerAdminRequest;
    const actor = (userLabel || opts.surface) + ":ai";
    let opResult: { ok: boolean; message?: string; error?: string };

    try {
      if (req.action === "stats") {
        const msg = await ownerPlatformStats();
        opResult = { ok: true, message: msg };
      } else if (req.action === "grant") {
        opResult = await ownerGrantTxByEmail(req.email || "", req.amount ?? 0, actor);
      } else if (req.action === "subtract") {
        opResult = await ownerSubtractTxByEmail(req.email || "", req.amount ?? 0, actor);
      } else if (req.action === "lookup") {
        opResult = await ownerLookupUserByEmail(req.email || "");
      } else if (req.action === "unban") {
        const phone = String(req.phone || "").replace(/\D/g, "");
        if (!phone || phone.length < 8) {
          opResult = { ok: false, error: "Missing phone. Example: unban 2547xxxxxxxx" };
        } else {
          const u = await unbanWaContact(phone, getActiveWaSock());
          opResult = u.ok ? { ok: true, message: u.message } : { ok: false, error: u.message };
        }
      } else if (
        req.action === "flags" ||
        req.action === "disable" ||
        req.action === "enable" ||
        req.action === "disablepay" ||
        req.action === "enablepay"
      ) {
        opResult = await runFlagAdmin(req.action, req.key);
      } else {
        opResult = { ok: false, error: "Unknown admin action." };
      }
    } catch (err) {
      logger.warn({ err, req }, "AI owner admin action failed");
      opResult = { ok: false, error: "Action failed. Try again." };
    }

    const resultText = opResult.ok
      ? opResult.message || "Done."
      : "❌ " + (opResult.error || "Failed.");

    const combined =
      parsed.text &&
      parsed.text.length < 200 &&
      !/don't have|no access|cannot|can't/i.test(parsed.text)
        ? parsed.text + "\n\n" + resultText
        : resultText;

    if (userLabel) appendMemory(userLabel, "assistant", combined);

    return {
      text: combined,
      requestLiveAgent: parsed.requestLiveAgent,
      deployRequest: parsed.deployRequest,
    };
  }

  if (parsed.ownerAdminRequest && !opts.isOwner) {
    logger.warn(
      { surface: opts.surface, userLabel },
      "AI emitted OWNER_ADMIN marker for non-owner — ignored"
    );
  }

  if (userLabel && parsed.text) appendMemory(userLabel, "assistant", parsed.text);

  return {
    text: parsed.text,
    requestLiveAgent: parsed.requestLiveAgent,
    deployRequest: parsed.deployRequest,
  };
}
