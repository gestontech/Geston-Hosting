import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import {
  isTanzaniaAvailable,
  initiateSpeedPesaPayment,
  getSpeedPesaPaymentStatus,
} from "../../services/speedpesa.js";
import { notifyOwner } from "../../services/notify.js";
import { createNotification } from "../../services/notifications.js";
import { getParam } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

function normalizeTanzaniaPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "255" + digits.slice(1);
  if (digits.length === 9) return "255" + digits;
  return null;
}

router.post("/initiate-tanzania", authGuard, banCheck, requirePaymentMethod("tanzania"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isTanzaniaAvailable()) { res.status(503).json({ error: "Tanzania payments are not available." }); return; }
    const schema = z.object({
      tzsAmount: z.number().min(500),
      txAmount: z.number().min(1),
      bonusTx: z.number().min(0).default(0),
      phone: z.string().min(8).max(16),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { tzsAmount, txAmount, bonusTx } = parsed.data;
    const phone = normalizeTanzaniaPhone(parsed.data.phone);
    if (!phone || !/^255[67]\d{8}$/.test(phone)) { res.status(400).json({ error: "Enter a valid Tanzania mobile number (e.g. 0712345678)" }); return; }
    const TZS_PER_TX = 150;
    const expectedTzsAmount = txAmount * TZS_PER_TX;
    if (Math.abs(tzsAmount - expectedTzsAmount) > 1) { res.status(400).json({ error: "Invalid package amount" }); return; }
    const totalTx = txAmount + bonusTx;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const result = await initiateSpeedPesaPayment({ phonenumber: phone, amount: tzsAmount });
    if (!result.success || !result.reference) {
      res.status(500).json({ error: result.message || "Failed to initiate payment" });
      return;
    }
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: totalTx,
      ksAmount: tzsAmount,
      paystackRef: result.reference,
      status: "pending",
      paystackCountry: "tanzania",
    });
    res.json({ reference: result.reference });
  } catch (err) {
    next(err);
  }
});

router.get("/tanzania-status/:reference", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reference = getParam(req.params.reference);
    const result = await getSpeedPesaPaymentStatus(reference);
    if (!result.success) { res.json({ status: "pending" }); return; }
    if (result.status === "SUCCESS") {
      const tx = await Transaction.findOne({ paystackRef: reference, userId: req.user!._id });
      if (tx && tx.status === "pending") {
        tx.status = "success";
        await tx.save();
        const user = await User.findById(req.user!._id);
        if (user) {
          user.txCoins += tx.txAmount;
          await user.save();
          notifyOwner(`💰 *Tanzania Payment Received*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins (TZS ${tx.ksAmount})\nRef: \`${reference}\``).catch(() => {});
          createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins (TZS ${tx.ksAmount}).`).catch(() => {});
        }
        res.json({ status: "success", txAmount: tx.txAmount });
        return;
      }
      if (tx && tx.status === "success") { res.json({ status: "success", txAmount: tx.txAmount }); return; }
    }
    if (result.status === "FAILED") {
      const tx = await Transaction.findOne({ paystackRef: reference, userId: req.user!._id });
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
