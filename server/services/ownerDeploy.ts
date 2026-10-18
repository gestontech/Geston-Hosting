import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import { Team } from "../models/Team.js";
import { Transaction } from "../models/Transaction.js";
import {
  deployBotApp,
  findBestTeam,
  setConfigVar,
  getSetupStatus,
  appExists,
} from "./heroku.js";
import { notifyOwner } from "./notify.js";
import { createNotification } from "./notifications.js";
import { isServiceDisabled } from "../lib/featureFlags.js";
import { logger } from "../logger.js";

export type OwnerDeployInput = {
  appName: string;
  sessionVar: string;
  device?: "android" | "ios";
  isTrial?: boolean;
  months?: number;
  /** Label for logs, e.g. tg:123 or wa:254... */
  actorLabel: string;
};

export type OwnerDeployResult =
  | { ok: true; message: string; botId: string; appName: string }
  | { ok: false; error: string };

/**
 * Resolve the platform admin User document that owns AI/bot-deployed bots.
 * Priority:
 *  1. ADMIN_EMAIL env (exact match)
 *  2. First user with isModerator: true
 *  3. null (caller should fail clearly)
 */
export async function resolveAdminUser(): Promise<InstanceType<typeof User> | null> {
  const adminEmail = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  if (adminEmail) {
    const byEmail = await User.findOne({ email: adminEmail });
    if (byEmail) return byEmail;
  }
  const mod = await User.findOne({ isModerator: true }).sort({ createdAt: 1 });
  if (mod) return mod;
  return null;
}

function sanitizeAppName(raw: string): string {
  let name = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (name.length < 3) name = "gstnhost-" + Date.now().toString(36);
  if (name.length > 30) name = name.slice(0, 30).replace(/-$/, "");
  return name;
}

function pollBotSetup(
  botId: string,
  setupId: string | undefined,
  appName: string,
  userId: string,
  label: string
): void {
  if (!setupId) {
    (async () => {
      try {
        const exists = await appExists(appName);
        await Bot.findByIdAndUpdate(botId, { status: exists ? "running" : "stopped" });
        if (exists) {
          createNotification(
            userId,
            "deploy",
            "Bot deployed",
            `${label} "${appName}" is now running.`
          ).catch(() => {});
        } else {
          createNotification(
            userId,
            "deploy",
            "Bot deploy failed",
            `${label} "${appName}" failed to build.`
          ).catch(() => {});
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
      if (exists) {
        createNotification(
          userId,
          "deploy",
          "Bot deployed",
          `${label} "${appName}" is now running.`
        ).catch(() => {});
      } else {
        createNotification(
          userId,
          "deploy",
          "Bot deploy failed",
          `${label} "${appName}" failed to build.`
        ).catch(() => {});
      }
      return;
    }
    attempts++;
    const { status } = await getSetupStatus(setupId).catch(() => ({ status: "unknown" }));
    if (status === "succeeded") {
      await Bot.findByIdAndUpdate(botId, { status: "running" });
      createNotification(
        userId,
        "deploy",
        "Bot deployed",
        `${label} "${appName}" is now running.`
      ).catch(() => {});
    } else if (status === "failed") {
      await Bot.findByIdAndUpdate(botId, { status: "failed" });
      createNotification(
        userId,
        "deploy",
        "Bot deploy failed",
        `${label} "${appName}" failed to build.`
      ).catch(() => {});
    } else {
      setTimeout(() => {
        poll().catch(() => {});
      }, 15000);
    }
  };
  setTimeout(() => {
    poll().catch(() => {});
  }, 15000);
}

/**
 * Deploy a bot under the admin account (same shape as a normal dashboard deploy).
 * Owner/AI path: no Coins charge (admin privilege). Bot appears on the admin dashboard
 * with full lifecycle controls (restart, stop, logs, delete, etc.).
 */
export async function deployBotForAdmin(input: OwnerDeployInput): Promise<OwnerDeployResult> {
  if (await isServiceDisabled("botDeploy")) {
    return { ok: false, error: "Bot deployment is currently disabled." };
  }

  const sessionVar = String(input.sessionVar || "").trim();
  if (sessionVar.length < 20) {
    return { ok: false, error: "Session ID looks too short. Paste the full session string." };
  }

  const appName = sanitizeAppName(input.appName);
  const device = input.device === "ios" ? "ios" : "android";
  const isTrial = !!input.isTrial;
  const months = Math.min(9, Math.max(1, Number(input.months) || 1));

  const user = await resolveAdminUser();
  if (!user) {
    return {
      ok: false,
      error:
        "Admin account not found. Set ADMIN_EMAIL to your dashboard login email, or mark your user as moderator.",
    };
  }

  const existing = await Bot.findOne({ herokuAppName: appName });
  if (existing) {
    if (["deleted", "expired"].includes(existing.status)) {
      await Bot.deleteOne({ _id: existing._id });
      await User.updateOne({ _id: existing.userId }, { $pull: { bots: existing._id } });
    } else {
      return {
        ok: false,
        error: `App name "${appName}" is already in use. Pick another name.`,
      };
    }
  }

  const teams = await Team.find({ active: true });
  const teamNames = teams.length > 0 ? teams.map((t) => t.name) : ["gestontech254"];
  const bestTeam = await findBestTeam(teamNames);
  if (!bestTeam) {
    return { ok: false, error: "No available Heroku teams for deployment." };
  }

  const deployed = await deployBotApp(
    appName,
    bestTeam,
    sessionVar,
    isTrial ? "pending" : "",
    isTrial
  );
  if (!deployed.success) {
    return { ok: false, error: "Heroku deploy failed. Check HEROKU_API_KEY / team capacity." };
  }

  if (device === "ios") {
    await setConfigVar(appName, "DEVICE", "ios").catch(() => {});
  }

  const deployedAt = new Date();
  const expiresAt = isTrial
    ? new Date(deployedAt.getTime() + 48 * 60 * 60 * 1000)
    : new Date(deployedAt.getTime() + months * 30 * 24 * 60 * 60 * 1000);

  // Owner AI deploys are free — same Bot record as a normal user deploy under admin userId
  const cost = 0;
  const bot = await Bot.create({
    userId: user._id,
    herokuAppName: appName,
    phoneNumber: "",
    sessionVar,
    deployedAt,
    expiresAt,
    isTrial,
    status: "building",
    teamName: bestTeam,
    setupId: deployed.setupId || "",
    cost,
  });

  user.bots.push(bot._id);
  if (isTrial) user.usedFreeTrial = true;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: "deploy",
    txAmount: cost,
    ksAmount: 0,
    status: "success",
    paystackRef: "owner-ai:" + String(input.actorLabel || "").slice(0, 40),
  });

  const label = isTrial ? "Trial bot (AI)" : "Bot (AI)";
  notifyOwner(
    `🚀 *AI Deploy*\n\nApp: \`${appName}\`\nOwner account: \`${user.email}\`\nTrial: ${isTrial}\nMonths: ${months}\nBy: ${input.actorLabel}`
  ).catch(() => {});

  pollBotSetup(bot._id.toString(), deployed.setupId, appName, user._id.toString(), label);

  logger.info(
    { appName, userId: user._id.toString(), actor: input.actorLabel, isTrial },
    "Owner AI bot deploy started under admin account"
  );

  return {
    ok: true,
    botId: bot._id.toString(),
    appName,
    message:
      `Deploy started for *${appName}* under your admin account (${user.email}).\n` +
      `Status: building → will show as running on the dashboard when ready.\n` +
      `You can manage it like any other bot (restart, stop, logs, delete).`,
  };
}
