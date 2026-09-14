import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { createNotification } from "./notifications.js";
import { logger } from "../logger.js";

export async function refundBotCost(botId: string, userId: string, appName: string, label: string): Promise<boolean> {
  try {
    const bot = await Bot.findById(botId);
    if (!bot || bot.refunded || !bot.cost || bot.cost <= 0) return false;
    const updated = await Bot.findOneAndUpdate({ _id: botId, refunded: { $ne: true } }, { refunded: true }, { new: true });
    if (!updated) return false;
    await User.findByIdAndUpdate(userId, { $inc: { txCoins: bot.cost } });
    await Transaction.create({ userId, type: "refund", txAmount: bot.cost, ksAmount: bot.cost * 3, status: "success" });
    createNotification(userId, "refund", "Coins refunded", `${label} "${appName}" failed to build, so ${bot.cost} Coins was refunded to your balance.`).catch(() => {});
    return true;
  } catch (err) {
    logger.warn({ err, botId }, "refundBotCost failed");
    return false;
  }
}

export async function reconcileFailedBotRefunds(): Promise<void> {
  try {
    const staleCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const unrefunded = await Bot.find({
      status: "failed",
      refunded: { $ne: true },
      cost: { $gt: 0 },
      deployedAt: { $lt: staleCutoff },
    }).lean();
    for (const bot of unrefunded) {
      const ok = await refundBotCost(bot._id.toString(), bot.userId.toString(), bot.herokuAppName, "Bot");
      if (ok) logger.info({ botId: bot._id, appName: bot.herokuAppName }, "Reconciliation: refunded a failed deploy that was missed");
    }
  } catch (err) {
    logger.warn({ err }, "reconcileFailedBotRefunds failed (safe to ignore)");
  }
}
