import { Router, type Response, type NextFunction } from "express";
import { User } from "../../models/User.js";
import { Bot } from "../../models/Bot.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { userPayload } from "./shared.js";

const router = Router();

router.get("/me", authGuard, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ user: userPayload(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

router.delete("/me", authGuard, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { deleteApp } = await import("../../services/heroku.js");
    const userBots = await Bot.find({ userId });
    await Promise.all(userBots.map(async b => { try { await deleteApp(b.herokuAppName); } catch {} }));
    await Bot.deleteMany({ userId });
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
    res.clearCookie("token");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
