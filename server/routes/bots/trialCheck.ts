import { Router, type Request, type Response, type NextFunction } from "express";
import { Bot } from "../../models/Bot.js";
import { User } from "../../models/User.js";
import { BlockedTrial } from "../../models/BlockedTrial.js";
import { deleteApp } from "../../services/heroku.js";
import { cleanPhoneNumber } from "./shared.js";

const router = Router();

router.get("/trial-check/:phone", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phone = cleanPhoneNumber(String(req.params.phone)).slice(0, 15);
    const appParam = req.query.app ? String(req.query.app).trim() : "";
    if (!phone || phone.length < 10) { res.json({ status: "not_found" }); return; }

    if (appParam) {
      const botByName = await Bot.findOne({ herokuAppName: appParam, isTrial: false, status: { $nin: ["deleted", "expired"] } });
      if (botByName) { res.json({ status: "paid" }); return; }
    }
    const paidBot = await Bot.findOne({ phoneNumber: phone, isTrial: false, status: { $nin: ["deleted", "expired"] } });
    if (paidBot) { res.json({ status: "paid" }); return; }

    const blocked = await BlockedTrial.findOne({ phoneNumber: phone });
    if (blocked) {
      if (appParam) {
        (async () => { try { await deleteApp(appParam); } catch {} })();
        const staleBot = await Bot.findOne({ herokuAppName: appParam, isTrial: true });
        if (staleBot) {
          await Bot.deleteOne({ _id: staleBot._id });
          await User.updateOne({ _id: staleBot.userId }, { $pull: { bots: staleBot._id } });
        }
      }
      res.json({ status: "trial_ended" }); return;
    }

    const thisBot = appParam ? await Bot.findOne({ herokuAppName: appParam, isTrial: true }) : null;

    const otherActiveTrial = await Bot.findOne({
      phoneNumber: phone,
      isTrial: true,
      status: { $nin: ["deleted", "expired"] },
      expiresAt: { $gt: new Date() },
      ...(thisBot ? { _id: { $ne: thisBot._id } } : {})
    });
    if (otherActiveTrial) {
      if (thisBot) {
        (async () => { try { await deleteApp(thisBot.herokuAppName); await Bot.deleteOne({ _id: thisBot._id }); await User.updateOne({ _id: thisBot.userId }, { $pull: { bots: thisBot._id } }); } catch {} })();
      }
      const owner = await User.findById(otherActiveTrial.userId);
      if (owner) {
        await BlockedTrial.findOneAndUpdate({ phoneNumber: phone }, { phoneNumber: phone, email: owner.email }, { upsert: true });
      }
      res.json({ status: "trial_ended" }); return;
    }

    if (thisBot && !thisBot.phoneNumber) {
      await Bot.findByIdAndUpdate(thisBot._id, { phoneNumber: phone });
    }

    const trialBot = thisBot || await Bot.findOne({ phoneNumber: phone, isTrial: true });

    if (trialBot) {
      const expired = new Date(trialBot.expiresAt) < new Date() || ["expired", "deleted"].includes(trialBot.status);
      if (!expired) { res.json({ status: "active_trial" }); return; }
      (async () => { try { await deleteApp(trialBot!.herokuAppName); await Bot.deleteOne({ _id: trialBot!._id }); await User.updateOne({ _id: trialBot!.userId }, { $pull: { bots: trialBot!._id } }); } catch {} })();
      const owner = await User.findById(trialBot.userId);
      if (owner) {
        await BlockedTrial.findOneAndUpdate(
          { phoneNumber: phone },
          { phoneNumber: phone, email: owner.email },
          { upsert: true }
        );
      }
      res.json({ status: "trial_ended" }); return;
    }

    res.json({ status: "not_found" });
  } catch { res.json({ status: "not_found" }); }
});

export default router;
