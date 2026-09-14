import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import {
  isDRCAvailable,
  initiateWonyaPayment,
  getWonyaPaymentStatus,
  normalizeDRCPhone,
} from "../../services/wonyapay.js";
import { notifyOwner } from "../../services/notify.js";
import { createNotification } from "../../services/notifications.js";
import { getParam } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/initiate-drc", authGuard, banCheck, requirePaymentMethod("drc"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isDRCAvailable()) { res.status(503).json({ error: "DR Congo payments are not available." }); return; }
    const schema = z.object({
      amount: z.number().positive(),
      currency: z.enum(["CDF", "USD"]).default("USD"),
      txAmount: z.number().min(1),
      bonusTx: z.number().min(0).default(0),
      phone: z.string().min(8).max(16),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { amount, currency, txAmount, bonusTx } = parsed.data;
    const phone = normalizeDRCPhone(parsed.data.phone);
    if (!phone) { res.status(400).json({ error: "Enter a valid DR Congo mobile number (e.g. 0997654321)" }); return; }
    const totalTx = txAmount + bonusTx;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const result = await initiateWonyaPayment({ amount, currency, phone, reason: `Geston Hosting: ${totalTx} Coins top-up` });
    if (!result.success || !result.refTransa) {
      res.status(500).json({ error: result.message || "Failed to initiate payment" });
      return;
    }

    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: totalTx,
      ksAmount: amount,
      paystackRef: result.refTransa,
      status: "pending",
      paystackCountry: "drc",
    });

    res.json({ refTransa: result.refTransa });
  } catch (err) {
    next(err);
  }
});

router.get("/drc-status/:refTransa", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refTransa = getParam(req.params.refTransa);
    const result = await getWonyaPaymentStatus(refTransa);
    if (!result.success) { res.json({ status: "pending" }); return; }
    if (result.status === "completed") {
      const tx = await Transaction.findOne({ paystackRef: refTransa, userId: req.user!._id });
      if (tx && tx.status === "pending") {
        tx.status = "success";
        await tx.save();
        const user = await User.findById(req.user!._id);
        if (user) {
          user.txCoins += tx.txAmount;
          await user.save();
          notifyOwner(`💰 *DRC Payment Received*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins (${tx.ksAmount})\nRef: \`${refTransa}\``).catch(() => {});
          createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins.`).catch(() => {});
        }
        res.json({ status: "success", txAmount: tx.txAmount });
        return;
      }
      if (tx && tx.status === "success") { res.json({ status: "success", txAmount: tx.txAmount }); return; }
    }
    if (result.status === "failed") {
      const tx = await Transaction.findOne({ paystackRef: refTransa, userId: req.user!._id });
      if (tx && tx.status === "pending") {
        tx.status = "failed";
        await tx.save();
      }
      res.json({ status: "failed" });
      return;
    }
    res.json({ status: "pending" });
  } catch (err) {
    next(err);
  }
});

export default router;
