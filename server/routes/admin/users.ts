import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../../models/User.js";
import { Bot } from "../../models/Bot.js";
import { Transaction } from "../../models/Transaction.js";
import { deleteApp } from "../../services/heroku.js";
import { ADMIN_EMAIL } from "./shared.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/users", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({ email: { $ne: ADMIN_EMAIL } }).lean();
    const bots = await Bot.find({}).lean();
    const botCountMap: Record<string, number> = {};
    for (const b of bots) { const id = b.userId?.toString(); if (id) botCountMap[id] = (botCountMap[id] || 0) + 1; }
    res.json(users.map(u => ({
      _id: u._id,
      email: u.email,
      username: u.username || "",
      txCoins: u.txCoins,
      botCount: botCountMap[u._id.toString()] || 0,
      isBanned: (u as unknown as { isBanned?: boolean }).isBanned || false,
      banReason: (u as unknown as { banReason?: string }).banReason || "",
      createdAt: (u as unknown as { createdAt?: Date }).createdAt,
      usedFreeTrial: (u as unknown as { usedFreeTrial?: boolean }).usedFreeTrial || false,
      referralCode: (u as unknown as { referralCode?: string }).referralCode || "",
      authProvider: (u as unknown as { authProvider?: string }).authProvider || "local",
      isModerator: (u as unknown as { isModerator?: boolean }).isModerator || false,
      isAdmin: (u.email || "").toLowerCase() === ADMIN_EMAIL,
    })));
  } catch (err) { next(err); }
});

router.post("/users/:id/ban", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body || {};
    const user = await User.findByIdAndUpdate(req.params.id, {
      isBanned: true,
      banReason: reason || "Banned by admin",
      bannedAt: new Date()
    }, { new: true });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/users/:id/unban", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isBanned: false,
      banReason: "",
      bannedAt: null
    }, { new: true });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/users/:id/tx", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body || {};
    const num = Number(amount);
    if (!num || num <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
    const user = await User.findByIdAndUpdate(req.params.id, { $inc: { txCoins: num } }, { new: true });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await Transaction.create({ userId: req.params.id, type: "admin_grant", txAmount: num, ksAmount: 0, status: "success" });
    res.json({ ok: true, txCoins: user.txCoins });
  } catch (err) { next(err); }
});

router.post("/users/:id/subtract-tx", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body || {};
    const num = Number(amount);
    if (!num || num <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    user.txCoins = Math.max(0, user.txCoins - num);
    await user.save();
    res.json({ ok: true, txCoins: user.txCoins });
  } catch (err) { next(err); }
});

router.post("/users/:id/password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) { res.status(400).json({ error: "Password too short" }); return; }
    const hash = await bcrypt.hash(password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, { passwordHash: hash }, { new: true });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/users/:id/notify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message } = req.body || {};
    const cleanTitle = String(title || "").trim();
    const cleanMessage = String(message || "").trim();
    if (!cleanTitle || !cleanMessage) { res.status(400).json({ error: "Title and message are required" }); return; }
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { createNotification } = await import("../../services/notifications.js");
    await createNotification(user._id, "general", cleanTitle.slice(0, 200), cleanMessage.slice(0, 2000));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const userBots = await Bot.find({ userId: req.params.id });
    await Promise.all(userBots.map(async b => { try { await deleteApp(b.herokuAppName); } catch {} }));
    await Bot.deleteMany({ userId: req.params.id });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/users/:id/moderator", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const newStatus = !user.isModerator;
    user.isModerator = newStatus;
    if (newStatus) {
      user.txCoins += 100;
      await user.save();
      await Transaction.create({ userId: user._id, type: "admin_grant", txAmount: 100, ksAmount: 0, status: "success" });
      const { createNotification } = await import("../../services/notifications.js");
      await createNotification(user._id, "general", "You've been promoted to Moderator!", "Congratulations! You now have moderator status on Geston Hosting. You've received 100 Coins as a welcome bonus.").catch(() => {});
    } else {
      await user.save();
    }
    res.json({ ok: true, isModerator: newStatus });
  } catch (err) { next(err); }
});

export default router;
