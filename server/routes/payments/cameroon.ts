import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import {
  isCameroonAvailable,
  initiateFapshiDirectPay,
  initiateFapshiPayment,
  getFapshiPaymentStatus,
} from "../../services/fapshi.js";
import { notifyOwner } from "../../services/notify.js";
import { createNotification } from "../../services/notifications.js";
import { getParam } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

function normalizeCameroonPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("237")) digits = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);
  if (/^6\d{8}$/.test(digits)) return digits;
  return null;
}

router.post("/initiate-cameroon", authGuard, banCheck, requirePaymentMethod("cameroon"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isCameroonAvailable()) { res.status(503).json({ error: "Cameroon payments are not available." }); return; }
    const schema = z.object({
      xafAmount: z.number().min(100),
      txAmount: z.number().min(1),
      bonusTx: z.number().min(0).default(0),
      phone: z.string().min(8).max(16),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { xafAmount, txAmount, bonusTx } = parsed.data;
    const phone = normalizeCameroonPhone(parsed.data.phone);
    if (!phone) { res.status(400).json({ error: "Enter a valid Cameroon mobile number (e.g. 6XXXXXXXX)" }); return; }
    const totalTx = txAmount + bonusTx;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const externalId = `TXCM_${Date.now()}_${user._id.toString().slice(-6)}`;
    const displayName = user.username || user.email.split("@")[0];
    const directResult = await initiateFapshiDirectPay({
      amount: xafAmount,
      phone,
      name: displayName,
      email: user.email,
      externalId,
      message: `Geston Hosting: ${totalTx} Coins top-up`
    });
    if (directResult.success && directResult.transId) {
      const tx = await Transaction.create({
        userId: user._id,
        type: "topup",
        txAmount: totalTx,
        ksAmount: xafAmount,
        paystackRef: directResult.transId,
        status: "pending",
        paystackCountry: "cameroon",
      });
      res.json({ transId: directResult.transId, reference: tx.paystackRef });
      return;
    }
    if (!directResult.directPayUnavailable) {
      res.status(500).json({ error: directResult.message || "Failed to initiate payment" });
      return;
    }
    const hostedResult = await initiateFapshiPayment({
      amount: xafAmount,
      externalId,
      message: `Geston Hosting: ${totalTx} Coins top-up`
    });
    if (!hostedResult.success || !hostedResult.transId || !hostedResult.paymentUrl) {
      res.status(500).json({ error: hostedResult.message || "Failed to initiate payment" });
      return;
    }
    const tx = await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: totalTx,
      ksAmount: xafAmount,
      paystackRef: hostedResult.transId,
      status: "pending",
      paystackCountry: "cameroon",
    });
    res.json({ transId: hostedResult.transId, reference: tx.paystackRef, paymentUrl: hostedResult.paymentUrl });
  } catch (err) {
    next(err);
  }
});

router.get("/cameroon-status/:transId", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transId = getParam(req.params.transId);
    const result = await getFapshiPaymentStatus(transId);
    if (!result.success) { res.json({ status: "pending" }); return; }
    if (result.status === "SUCCESSFUL") {
      const tx = await Transaction.findOne({ paystackRef: transId, userId: req.user!._id });
      if (tx && tx.status === "pending") {
        tx.status = "success";
        await tx.save();
        const user = await User.findById(req.user!._id);
        if (user) {
          user.txCoins += tx.txAmount;
          await user.save();
          notifyOwner(`💰 *Cameroon Payment Received*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins (XAF ${tx.ksAmount})\nRef: \`${transId}\``).catch(() => {});
          createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins (XAF ${tx.ksAmount}).`).catch(() => {});
        }
        res.json({ status: "success", txAmount: tx.txAmount });
        return;
      }
      if (tx && tx.status === "success") { res.json({ status: "success", txAmount: tx.txAmount }); return; }
    }
    if (result.status === "FAILED" || result.status === "EXPIRED") {
      const tx = await Transaction.findOne({ paystackRef: transId, userId: req.user!._id });
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
