import { Router } from "express";
import { Bot } from "../../models/Bot.js";
import { User } from "../../models/User.js";
import { Team } from "../../models/Team.js";
import { TrialCheck } from "../../models/TrialCheck.js";
import { deleteApp, restartApp, getTeamApps, stopApp, startApp } from "../../services/heroku.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/bots", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const bots = await Bot.find({}).lean();
    const userMap: Record<string, { email: string; username?: string }> = {};
    const users = await User.find({}).select("email username").lean();
    for (const u of users) { userMap[u._id.toString()] = { email: u.email, username: u.username || "" }; }
    res.json(bots.map(b => ({
      ...b,
      ownerEmail: userMap[b.userId?.toString()]?.email || "unknown",
      ownerUsername: userMap[b.userId?.toString()]?.username || ""
    })));
  } catch (err) { next(err); }
});

router.post("/bots/:id/stop", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    await stopApp(bot.herokuAppName);
    await Bot.findByIdAndUpdate(req.params.id, { status: "stopped" });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/bots/:id/start", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    await startApp(bot.herokuAppName);
    await Bot.findByIdAndUpdate(req.params.id, { status: "running" });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/bots/:id/restart", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    await restartApp(bot.herokuAppName);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete("/bots/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    try { await deleteApp(bot.herokuAppName); } catch {}
    if (bot.isTrial && bot.phoneNumber) {
      await TrialCheck.findOneAndUpdate({ phoneNumber: bot.phoneNumber }, { status: "trial_ended" });
      const botOwner = await User.findById(bot.userId);
      if (botOwner) {
        const { BlockedTrial } = await import("../../models/BlockedTrial.js");
        await BlockedTrial.findOneAndUpdate(
          { phoneNumber: bot.phoneNumber },
          { phoneNumber: bot.phoneNumber, email: botOwner.email },
          { upsert: true }
        );
      }
    }
    await Bot.findByIdAndUpdate(req.params.id, { status: "deleted" });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/bots/:id/logs", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    const { getAppLogs } = await import("../../services/heroku.js");
    const logs = await getAppLogs(bot.herokuAppName);
    res.json({ logs });
  } catch (err) { next(err); }
});

router.get("/orphan-apps", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find({ active: true }).lean();
    const teamNames = teams.length > 0 ? (teams as { name: string }[]).map(t => t.name) : ["gestontech254"];
    const allAppNames: string[] = [];
    await Promise.all(teamNames.map(async team => {
      const apps = await getTeamApps(team);
      for (const name of apps) allAppNames.push(name);
    }));
    const siteApps = allAppNames.filter(n => n.startsWith("gestonhost-") || n.startsWith("gstnhost"));
    const dbBots = await Bot.find({ herokuAppName: { $in: siteApps }, status: { $ne: "deleted" } }).select("herokuAppName").lean();
    const dbNames = new Set(dbBots.map(b => b.herokuAppName));
    const orphans = siteApps.filter(n => !dbNames.has(n));
    res.json({ orphans });
  } catch (err) { next(err); }
});

router.delete("/orphan-apps/:appName", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteApp(String(req.params.appName || ""));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
