import { Router, type Response, type NextFunction } from "express";
import { Bot } from "../../models/Bot.js";
import { User } from "../../models/User.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { deleteApp } from "../../services/heroku.js";

const router = Router();

router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bots = await Bot.find({ userId: req.user!._id, status: { $ne: "deleted" } }).sort({ deployedAt: -1 }).lean();
    res.json(bots);
    const now = new Date();
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    for (const b of bots) {
      if (b.isTrial) continue;
      if (["running","stopped","building"].includes(b.status) && new Date(b.expiresAt) < now && !b.gracePeriodEnd) {
        (async () => { try { await Bot.findByIdAndUpdate(b._id, { status: "expired", gracePeriodEnd: new Date(new Date(b.expiresAt).getTime() + TWO_DAYS) }); } catch {} })();
      } else if (b.status === "expired" && b.gracePeriodEnd && new Date(b.gracePeriodEnd) < now) {
        (async () => { try { await deleteApp(b.herokuAppName); await Bot.deleteOne({ _id: b._id }); await User.updateOne({ _id: b.userId }, { $pull: { bots: b._id } }); } catch {} })();
      }
    }
  } catch (err) {
    next(err);
  }
});

export default router;
