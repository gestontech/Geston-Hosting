import { Router, type Response, type NextFunction, type Request } from "express";
import { z } from "zod";
import { Bot } from "../../models/Bot.js";
import { User } from "../../models/User.js";
import { Team } from "../../models/Team.js";
import { Transaction } from "../../models/Transaction.js";
import { BlockedTrial } from "../../models/BlockedTrial.js";
import { BotTemplate } from "../../models/BotTemplate.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import {
  deployBotApp,
  deleteApp,
  findBestTeam,
  setConfigVar,
  getSetupStatus,
  appExists
} from "../../services/heroku.js";
import { notifyOwner } from "../../services/notify.js";
import { createNotification } from "../../services/notifications.js";
import { refundBotCost } from "../../services/botRefund.js";
import { cleanPhoneNumber } from "./shared.js";
import { isServiceDisabled } from "../../lib/featureFlags.js";

const router = Router();

const deploySchema = z.object({
  phoneNumber: z.string().optional(),
  botName: z.string().optional(),
  sessionVar: z.string().min(1),
  isTrial: z.boolean().optional(),
  device: z.enum(["android", "ios"]).optional(),
  months: z.number().min(1).max(9).optional()
});

const deployTemplateSchema = z.object({
  botTemplateId: z.string().min(1),
  botName: z.string().min(5),
  sessionVar: z.string().min(1),
  device: z.enum(["android", "ios"]).optional(),
  months: z.number().min(1).max(9).optional(),
  extraVars: z.record(z.string(), z.string()).optional()
});

function hasCountryCode(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length >= 10 && !cleaned.startsWith("0");
}

function normalizePhone(phone: string): string {
  const digits = cleanPhoneNumber(phone);
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  return digits;
}

async function generateAppName(cleanPhone: string): Promise<string | null> {
  const existingBots = await Bot.find(
    { herokuAppName: { $regex: `-${cleanPhone}$` } },
    { herokuAppName: 1 }
  ).lean();
  const taken = new Set(existingBots.map(b => b.herokuAppName));
  const base = `gstnhost-${cleanPhone}`;
  if (!taken.has(base)) return base;
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  for (const a of alphabet) {
    const candidate = `gstnhost${a}-${cleanPhone}`;
    if (!taken.has(candidate)) return candidate;
  }
  for (const a of alphabet) {
    for (const b of alphabet) {
      const candidate = `gstnhost${a}${b}-${cleanPhone}`;
      if (!taken.has(candidate)) return candidate;
    }
  }
  return null;
}

function pollBotSetup(botId: string, setupId: string | undefined, appName: string, userId: string, label: string): void {
  if (!setupId) {
    (async () => {
      try {
        const exists = await appExists(appName);
        await Bot.findByIdAndUpdate(botId, { status: exists ? "running" : "stopped" });
        if (exists) createNotification(userId, "deploy", "Bot deployed", `${label} "${appName}" is now running.`).catch(() => {});
        else {
          createNotification(userId, "deploy", "Bot deploy failed", `${label} "${appName}" failed to build. Check logs or redeploy.`).catch(() => {});
          refundBotCost(botId, userId, appName, label).catch(() => {});
        }
      } catch {}
    })();
    return;
  }
  let attempts = 0;
  const poll = async (): Promise<void> => {
    if (attempts >= 24) {
      const exists = await appExists(appName).catch(() => false);
      await Bot.findByIdAndUpdate(botId, { status: exists ? "running" : "failed" });
      if (exists) createNotification(userId, "deploy", "Bot deployed", `${label} "${appName}" is now running.`).catch(() => {});
      else {
        createNotification(userId, "deploy", "Bot deploy failed", `${label} "${appName}" failed to build. Check logs or redeploy.`).catch(() => {});
        refundBotCost(botId, userId, appName, label).catch(() => {});
      }
      return;
    }
    attempts++;
    const { status } = await getSetupStatus(setupId).catch(() => ({ status: "unknown" }));
    if (status === "succeeded") {
      await Bot.findByIdAndUpdate(botId, { status: "running" });
      createNotification(userId, "deploy", "Bot deployed", `${label} "${appName}" is now running.`).catch(() => {});
    } else if (status === "failed") {
      await Bot.findByIdAndUpdate(botId, { status: "failed" });
      createNotification(userId, "deploy", "Bot deploy failed", `${label} "${appName}" failed to build. Check logs or redeploy.`).catch(() => {});
      refundBotCost(botId, userId, appName, label).catch(() => {});
    } else {
      setTimeout(() => { poll().catch(() => {}); }, 15000);
    }
  };
  setTimeout(() => { poll().catch(() => {}); }, 15000);
}

/** Parse owner/repo from any common GitHub URL shape */
function parseGithubRepoPath(githubRepo: string): string | null {
  const raw = String(githubRepo || "").trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const m = raw.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return null;
  return `${m[1]}/${m[2].replace(/\.git$/i, "")}`;
}

/** Only keys the platform injects itself — SESSION stays so users can fill it. */
const AUTO_ENV_KEYS = new Set([
  "BOT_NAME", "HEROKU_APP_NAME", "HEROKU_API_KEY", "EXPIRY_NOTICE", "DEVICE",
]);

router.post("/deploy", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (await isServiceDisabled("botDeploy")) {
      res.status(503).json({ error: "Bot deployment is currently disabled", serviceDisabled: "botDeploy" });
      return;
    }
    const parsed = deploySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { phoneNumber, botName, sessionVar, isTrial, device = "android", months = 1 } = parsed.data;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const teams = await Team.find({ active: true });
    const teamNames = teams.length > 0 ? teams.map(t => t.name) : ["gestontech254"];
    const bestTeam = await findBestTeam(teamNames);
    if (!bestTeam) { res.status(500).json({ error: "No available teams for deployment" }); return; }

    let appName: string;
    let cleanPhone = "";

    if (botName) {
      appName = botName;
      cleanPhone = `bot-${Date.now()}`;
    } else if (phoneNumber) {
      if (!hasCountryCode(phoneNumber)) {
        res.status(400).json({ error: "Phone number must include a country code (e.g., 254123456789)" });
        return;
      }
      cleanPhone = normalizePhone(phoneNumber);
      const generated = await generateAppName(cleanPhone);
      if (!generated) { res.status(500).json({ error: "Unable to generate app name, please try again" }); return; }
      appName = generated;
    } else {
      res.status(400).json({ error: "botName or phoneNumber required" });
      return;
    }

    const existingByName = await Bot.findOne({ herokuAppName: appName });
    if (existingByName) {
      if (["deleted", "expired"].includes(existingByName.status)) {
        await Bot.deleteOne({ _id: existingByName._id });
        await User.updateOne({ _id: existingByName.userId }, { $pull: { bots: existingByName._id } });
      } else {
        res.status(409).json({ error: "This bot name is already in use, please choose another" });
        return;
      }
    }

    if (isTrial) {
      const deployed = await deployBotApp(appName, bestTeam, sessionVar, "pending", true);
      if (!deployed.success) { res.status(500).json({ error: "Failed to deploy bot" }); return; }
      if (device === "ios") await setConfigVar(appName, "DEVICE", "ios");
      const deployedAt = new Date();
      const expiresAt = new Date(deployedAt.getTime() + 48 * 60 * 60 * 1000);
      const bot = await Bot.create({ userId: user._id, herokuAppName: appName, phoneNumber: "", sessionVar, deployedAt, expiresAt, isTrial: true, status: "building", teamName: bestTeam, setupId: deployed.setupId || "" });
      user.usedFreeTrial = true;
      user.bots.push(bot._id);
      await user.save();
      await Transaction.create({ userId: user._id, type: "deploy", txAmount: 0, ksAmount: 0, status: "success" });
      notifyOwner(`🤖 *Trial Bot Deployed*\n\nUser: \`${user.email}\`\nApp: \`${appName}\``).catch(() => {});
      res.json({ success: true, bot });
      pollBotSetup(bot._id.toString(), deployed.setupId, appName, user._id.toString(), "Free trial bot");
    } else {
      const cost = 10 * months;
      if (user.txCoins < cost) { res.status(403).json({ error: "Insufficient Coins", code: "INSUFFICIENT_COINS" }); return; }

      const deployed = await deployBotApp(appName, bestTeam, sessionVar, cleanPhone, false);
      if (!deployed.success) { res.status(500).json({ error: "Failed to deploy bot" }); return; }
      if (device === "ios") await setConfigVar(appName, "DEVICE", "ios");
      const deployedAt = new Date();
      const expiresAt = new Date(deployedAt.getTime() + months * 30 * 24 * 60 * 60 * 1000);
      const bot = await Bot.create({ userId: user._id, herokuAppName: appName, phoneNumber: cleanPhone, sessionVar, deployedAt, expiresAt, isTrial: false, status: "building", teamName: bestTeam, setupId: deployed.setupId || "", cost });
      user.txCoins -= cost;
      user.bots.push(bot._id);
      await user.save();
      await Transaction.create({ userId: user._id, type: "deploy", txAmount: cost, ksAmount: cost * 3, status: "success" });

      if (cleanPhone && phoneNumber) {
        const oldTrialBots = await Bot.find({ userId: user._id, isTrial: true, phoneNumber: cleanPhone });
        for (const tb of oldTrialBots) {
          (async () => { try { await deleteApp(tb.herokuAppName); } catch {} })();
          await Bot.deleteOne({ _id: tb._id });
          await User.updateOne({ _id: tb.userId }, { $pull: { bots: tb._id } });
        }
        await BlockedTrial.deleteOne({ phoneNumber: cleanPhone });
      }

      notifyOwner(`🚀 *Paid Bot Deployed*\n\nUser: \`${user.email}\`\nApp: \`${appName}\`\nMonths: ${months}\nCost: ${cost} Coins`).catch(() => {});
      res.json({ success: true, bot });
      pollBotSetup(bot._id.toString(), deployed.setupId, appName, user._id.toString(), "Paid bot");
    }
  } catch (err) {
    next(err);
  }
});

/**
 * Public — load required + optional env vars from the template's app.json.
 * Optional vars are those with required:false, a default value, or a generator.
 * SESSION is included so custom templates show it as a fillable field.
 */
router.get("/template-appvars/:templateId", async (req: Request, res: Response) => {
  try {
    const template = await BotTemplate.findById(req.params.templateId).lean();
    if (!template) {
      res.json({ vars: [], sessionIdUrl: "", error: "Template not found" });
      return;
    }
    const githubRepo = (template as unknown as { githubRepo?: string }).githubRepo || "";
    const sessionIdUrl = (template as unknown as { sessionIdUrl?: string }).sessionIdUrl || "";
    const repoPath = parseGithubRepoPath(githubRepo);
    if (!repoPath) {
      res.json({ vars: [], sessionIdUrl, error: "Invalid GitHub repo URL on template" });
      return;
    }

    const branches = ["main", "master", "develop", "HEAD"];
    type EnvEntry = { description?: string; required?: boolean; value?: string; generator?: string };

    for (const branch of branches) {
      try {
        const url = `https://raw.githubusercontent.com/${repoPath}/${branch}/app.json`;
        const r = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          headers: { Accept: "application/json", "User-Agent": "Geston-Hosting" },
        });
        if (!r.ok) continue;
        const appJson = (await r.json().catch(() => null)) as { env?: Record<string, EnvEntry> } | null;
        if (!appJson?.env || typeof appJson.env !== "object") {
          res.json({ vars: [], sessionIdUrl, branch });
          return;
        }
        const vars = Object.entries(appJson.env)
          .filter(([k]) => !AUTO_ENV_KEYS.has(k.toUpperCase()) && !AUTO_ENV_KEYS.has(k))
          .map(([k, v]) => {
            const hasDefault = !!(v.value || v.generator);
            const required = v.required !== false && !hasDefault;
            return {
              key: k,
              description: (v.description || k).trim(),
              required,
              value: v.value || "",
            };
          });
        res.json({ vars, sessionIdUrl, branch });
        return;
      } catch {
        /* try next branch */
      }
    }

    res.json({
      vars: [],
      sessionIdUrl,
      error: "Could not load app.json from GitHub (tried main/master/develop/HEAD)",
    });
  } catch {
    res.json({ vars: [], sessionIdUrl: "", error: "Failed to load vars" });
  }
});

router.post("/deploy-template", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (await isServiceDisabled("botDeploy")) {
        res.status(503).json({ error: "Bot deployment is currently disabled", serviceDisabled: "botDeploy" });
        return;
      }
      const parsed = deployTemplateSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
      const { botTemplateId, botName, sessionVar, device = "android", months = 1, extraVars } = parsed.data;
      const user = await User.findById(req.user!._id);
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      const template = await BotTemplate.findById(botTemplateId);
      if (!template) { res.status(404).json({ error: "Bot template not found" }); return; }
      const cost = (template.costTx ?? 10) * months;
      if (user.txCoins < cost) { res.status(403).json({ error: "Insufficient Coins", code: "INSUFFICIENT_COINS" }); return; }
      const teams = await Team.find({ active: true });
      const teamNames = teams.length > 0 ? teams.map(t => t.name) : ["gestontech254"];
      const bestTeam = await findBestTeam(teamNames);
      if (!bestTeam) { res.status(500).json({ error: "No available teams for deployment" }); return; }
      const deployedAt = new Date();
      const expiresAt = new Date(deployedAt.getTime() + months * 30 * 24 * 60 * 60 * 1000);
      const bot = await Bot.create({ userId: user._id, herokuAppName: botName, phoneNumber: "", sessionVar, deployedAt, expiresAt, isTrial: false, status: "building", teamName: bestTeam, templateId: botTemplateId, templateName: (template as unknown as { name: string }).name, sessionIdUrl: (template as unknown as { sessionIdUrl?: string }).sessionIdUrl || "", cost });
      user.txCoins -= cost;
      user.bots.push(bot._id);
      await user.save();
      await Transaction.create({ userId: user._id, type: "deploy", txAmount: cost, ksAmount: cost * 3, status: "success" });
      res.json({ success: true, bot });
      const templateIsDefault = (template as unknown as { isDefault?: boolean }).isDefault === true;
      (async () => {
        try {
          let deployed: { success: boolean; setupId?: string };
          if (!templateIsDefault && (template as unknown as { githubRepo?: string }).githubRepo) {
            const rawRepo = ((template as unknown as { githubRepo: string }).githubRepo).replace(/\.git$/, "");
            const tarballUrl = rawRepo + "/tarball/HEAD";
            const envOverrides: Record<string, string> = {
              ...(extraVars || {}),
              SESSION: sessionVar,
              BOT_NAME: botName,
              HEROKU_APP_NAME: botName,
              HEROKU_API_KEY: process.env.HEROKU_API_KEY || "",
            };
            deployed = await deployBotApp(botName, bestTeam, sessionVar, "", false, tarballUrl, envOverrides);
          } else {
            deployed = await deployBotApp(botName, bestTeam, sessionVar, "", false);
            if (deployed.success) {
              if (device === "ios") await setConfigVar(botName, "DEVICE", "ios").catch(() => {});
              if (extraVars) await Promise.all(Object.entries(extraVars).map(([k, v]) => setConfigVar(botName, k, v).catch(() => {})));
            }
          }
          if (deployed.success && deployed.setupId) {
            await Bot.findByIdAndUpdate(bot._id, { setupId: deployed.setupId });
            let attempts = 0;
            const poll = async (): Promise<void> => {
              if (attempts >= 24) {
                const exists = await appExists(botName).catch(() => false);
                await Bot.findByIdAndUpdate(bot._id, { status: exists ? "running" : "failed" });
                if (exists) createNotification(user._id, "deploy", "Bot deployed", `\"${botName}\" is now running.`).catch(() => {});
                else {
                  createNotification(user._id, "deploy", "Bot deploy failed", `\"${botName}\" failed to build. Check logs or redeploy.`).catch(() => {});
                  refundBotCost(bot._id.toString(), user._id.toString(), botName, "Bot").catch(() => {});
                }
                return;
              }
              attempts++;
              const { status } = await getSetupStatus(deployed.setupId!).catch(() => ({ status: "unknown" }));
              if (status === "succeeded") {
                await Bot.findByIdAndUpdate(bot._id, { status: "running" });
                notifyOwner(`🚀 *Template Bot Deployed*\n\nUser: \`${user.email}\`\nApp: \`${botName}\`\nTemplate: \`${(template as unknown as { name: string }).name}\`\nMonths: ${months}\nCost: ${cost} Coins`).catch(() => {});
                createNotification(user._id, "deploy", "Bot deployed", `\"${botName}\" is now running.`).catch(() => {});
              } else if (status === "failed") {
                await Bot.findByIdAndUpdate(bot._id, { status: "failed" });
                notifyOwner(`❌ *Template Deploy Failed*\n\nUser: \`${user.email}\`\nApp: \`${botName}\`\nTemplate: \`${(template as unknown as { name: string }).name}\``).catch(() => {});
                createNotification(user._id, "deploy", "Bot deploy failed", `\"${botName}\" failed to build. Check logs or redeploy.`).catch(() => {});
                refundBotCost(bot._id.toString(), user._id.toString(), botName, "Bot").catch(() => {});
              } else {
                setTimeout(() => { poll().catch(() => {}); }, 15000);
              }
            };
            setTimeout(() => { poll().catch(() => {}); }, 15000);
          } else if (deployed.success) {
            await Bot.findByIdAndUpdate(bot._id, { status: "running" });
            notifyOwner(`🚀 *Template Bot Deployed*\n\nUser: \`${user.email}\`\nApp: \`${botName}\`\nTemplate: \`${(template as unknown as { name: string }).name}\`\nMonths: ${months}\nCost: ${cost} Coins`).catch(() => {});
            createNotification(user._id, "deploy", "Bot deployed", `\"${botName}\" is now running.`).catch(() => {});
          } else {
            await Bot.findByIdAndUpdate(bot._id, { status: "failed" });
            createNotification(user._id, "deploy", "Bot deploy failed", `\"${botName}\" failed to build. Check logs or redeploy.`).catch(() => {});
            refundBotCost(bot._id.toString(), user._id.toString(), botName, "Bot").catch(() => {});
          }
        } catch (err) {
          try {
            await Bot.findByIdAndUpdate(bot._id, { status: "failed" });
            createNotification(user._id, "deploy", "Bot deploy failed", `\"${botName}\" failed to build. Check logs or redeploy.`).catch(() => {});
            await refundBotCost(bot._id.toString(), user._id.toString(), botName, "Bot");
            notifyOwner(`❌ *Template Deploy Failed*\n\nUser: \`${user.email}\`\nApp: \`${botName}\`\nTemplate: \`${(template as unknown as { name: string }).name}\`\nReason: unexpected error${err instanceof Error ? `: ${err.message}` : ""}`).catch(() => {});
          } catch {}
        }
      })();
    } catch (err) {
      next(err);
    }
  });

export default router;
