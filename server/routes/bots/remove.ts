import { Router, type Response, type NextFunction } from "express";
import { Bot } from "../../models/Bot.js";
import { User } from "../../models/User.js";
import { TrialCheck } from "../../models/TrialCheck.js";
import { BlockedTrial } from "../../models/BlockedTrial.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { deleteApp } from "../../services/heroku.js";

const router = Router();

router.post("/:id/delete", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    try { await deleteApp(bot.herokuAppName); } catch {}
    if (bot.isTrial && bot.phoneNumber) {
      await TrialCheck.findOneAndUpdate({ phoneNumber: bot.phoneNumber }, { status: "trial_ended" });
      const botOwner = await User.findById(bot.userId);
      if (botOwner) {
        await BlockedTrial.findOneAndUpdate(
          { phoneNumber: bot.phoneNumber },
          { phoneNumber: bot.phoneNumber, email: botOwner.email },
          { upsert: true, new: true }
        );
      }
    }
    await Bot.deleteOne({ _id: bot._id });
    await User.updateOne({ _id: req.user!._id }, { $pull: { bots: bot._id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    try { await deleteApp(bot.herokuAppName); } catch {}
    if (bot.isTrial && bot.phoneNumber) {
      await TrialCheck.findOneAndUpdate({ phoneNumber: bot.phoneNumber }, { status: "trial_ended" });
      const botOwner = await User.findById(bot.userId);
      if (botOwner) {
        await BlockedTrial.findOneAndUpdate(
          { phoneNumber: bot.phoneNumber },
          { phoneNumber: bot.phoneNumber, email: botOwner.email },
          { upsert: true }
        );
      }
    }
    await Bot.deleteOne({ _id: bot._id });
    await User.updateOne({ _id: req.user!._id }, { $pull: { bots: bot._id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
