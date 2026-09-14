import { Router } from "express";
import { Coupon } from "../../models/Coupon.js";
import { Referral } from "../../models/Referral.js";
import { Tutorial } from "../../models/Tutorial.js";
import { BotTemplate } from "../../models/BotTemplate.js";
import { Bot } from "../../models/Bot.js";
import { Panel } from "../../models/Panel.js";
import { User } from "../../models/User.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/coupons", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
    res.json(coupons);
  } catch (err) { next(err); }
});

router.post("/coupons", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, txAmount, maxUses, expiresAt } = req.body || {};
    if (!code || !txAmount) { res.status(400).json({ error: "Code and Coins amount are required" }); return; }
    const coupon = await Coupon.create({ code: code.toUpperCase(), txAmount, maxUses: maxUses || 1, expiresAt: expiresAt ? new Date(expiresAt) : null });
    res.json({ ok: true, coupon });
  } catch (err) { next(err); }
});

router.delete("/coupons/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/referrals", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const referrals = await Referral.find({}).sort({ createdAt: -1 }).lean();
    const userMap: Record<string, { email: string }> = {};
    const users = await User.find({}).select("email").lean();
    for (const u of users) { userMap[u._id.toString()] = { email: u.email }; }
    res.json(referrals.map(r => ({
      ...r,
      referrerEmail: userMap[(r as unknown as { referrerId: { toString(): string } }).referrerId?.toString()]?.email || "unknown",
      referredEmail: userMap[(r as unknown as { referredId: { toString(): string } }).referredId?.toString()]?.email || "unknown"
    })));
  } catch (err) { next(err); }
});

router.delete("/referrals/all", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await Referral.deleteMany({});
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/tutorials", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tutorials = await Tutorial.find({}).sort({ order: 1, createdAt: -1 }).lean();
    res.json(tutorials);
  } catch (err) { next(err); }
});

router.post("/tutorials", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, youtubeUrl, order } = req.body || {};
    if (!title || !youtubeUrl) { res.status(400).json({ error: "Title and YouTube URL are required" }); return; }
    const tutorial = await Tutorial.create({ title, youtubeUrl, order: order ?? 0 });
    res.json({ ok: true, tutorial });
  } catch (err) { next(err); }
});

router.delete("/tutorials/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Tutorial.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/bot-templates", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await BotTemplate.find({}).sort({ order: 1, createdAt: -1 }).lean();
    const deployCountMap: Record<string, number> = {};
    const counts = await Bot.aggregate([
      { $match: { templateId: { $exists: true, $ne: "" }, status: { $ne: "deleted" } } },
      { $group: { _id: "$templateId", count: { $sum: 1 } } }
    ]);
    for (const c of counts) { deployCountMap[c._id] = c.count; }
    res.json(templates.map(t => ({ ...t, deployCount: deployCountMap[(t as unknown as { _id: { toString(): string } })._id.toString()] || 0 })));
  } catch (err) { next(err); }
});

router.post("/bot-templates", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, repoUrl, shareableSlug, sessionIdUrl, order } = req.body || {};
    if (!name || !repoUrl) { res.status(400).json({ error: "Name and repo URL are required" }); return; }
    const template = await BotTemplate.create({ name, description: description || "", repoUrl, shareableSlug: shareableSlug || name.toLowerCase().replace(/\s+/g, "-"), sessionIdUrl: sessionIdUrl || "", order: order ?? 0 });
    res.json({ ok: true, template });
  } catch (err) { next(err); }
});

router.delete("/bot-templates/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await BotTemplate.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/panel-plans", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { PanelPlan } = await import("../../models/PanelPlan.js");
    const plans = await PanelPlan.find({}).lean();
    res.json(plans);
  } catch (err) { next(err); }
});

router.post("/panel-plans", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { PanelPlan } = await import("../../models/PanelPlan.js");
    const { name, txCost, ram, disk, cpu, description } = req.body || {};
    if (!name || !txCost) { res.status(400).json({ error: "Name and Coins cost are required" }); return; }
    const plan = await PanelPlan.create({ name, txCost, ram: ram || 1024, disk: disk || 5000, cpu: cpu || 100, description: description || "" });
    res.json({ ok: true, plan });
  } catch (err) { next(err); }
});

router.delete("/panel-plans/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { PanelPlan } = await import("../../models/PanelPlan.js");
    await PanelPlan.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/panels", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const panels = await Panel.find({}).lean();
    const userMap: Record<string, { email: string; username?: string }> = {};
    const users = await User.find({}).select("email username").lean();
    for (const u of users) { userMap[u._id.toString()] = { email: u.email, username: u.username || "" }; }
    res.json(panels.map(p => ({
      ...(p as object),
      ownerEmail: userMap[(p as unknown as { userId: { toString(): string } }).userId?.toString()]?.email || "unknown",
      ownerUsername: userMap[(p as unknown as { userId: { toString(): string } }).userId?.toString()]?.username || ""
    })));
  } catch (err) { next(err); }
});

router.delete("/panels/panel/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Panel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
