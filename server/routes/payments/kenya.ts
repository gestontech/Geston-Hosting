import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Package } from "../../models/Package.js";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import {
  verifyTransaction,
  verifyTransactionNg,
  initializeTransaction,
  chargeMobileMoney,
  getChargeStatus,
  normalizePhone,
} from "../../services/paystack.js";
import { notifyOwner } from "../../services/notify.js";
import { createNotification } from "../../services/notifications.js";
import { initiateSchema, chargeSchema, verifySchema } from "../../lib/paymentSchemas.js";
import { getParam } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();
const MAX_DAILY_FAILURES = 5;
const TX_RATE_KES = 5;

async function recordPaymentFailure(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user || user.isBanned) return;
  const today = new Date().toISOString().slice(0, 10);
  const currentDate = (user as unknown as { paymentFailDate?: string }).paymentFailDate || "";
  const currentCount = (user as unknown as { paymentFailCount?: number }).paymentFailCount || 0;
  const newCount = currentDate === today ? currentCount + 1 : 1;
  if (newCount >= MAX_DAILY_FAILURES) {
    await User.findByIdAndUpdate(userId, {
      isBanned: true,
      banReason: "Automated: excessive payment failures",
      paymentFailCount: newCount,
      paymentFailDate: today
    });
  } else {
    await User.findByIdAndUpdate(userId, { paymentFailCount: newCount, paymentFailDate: today });
  }
}

router.post("/initiate", authGuard, banCheck, requirePaymentMethod("kenya"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = initiateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const pkg = await Package.findById(parsed.data.packageId);
    if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TX_${Date.now()}_${user._id.toString().slice(-6)}`;
    const result = await initializeTransaction(user.email, pkg.ksPrice, reference, {
      packageId: pkg._id.toString(),
      userId: user._id.toString(),
      txAmount: pkg.txAmount + pkg.bonusTx
    });
    if (!result.success) { res.status(500).json({ error: "Failed to initialize payment" }); return; }
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: pkg.txAmount + pkg.bonusTx,
      ksAmount: pkg.ksPrice,
      paystackRef: reference,
      status: "pending",
      paystackCountry: "kenya",
    });
    res.json({ authorizationUrl: result.authorizationUrl, accessCode: result.accessCode, reference });
  } catch (err) {
    next(err);
  }
});

router.post("/charge", authGuard, banCheck, requirePaymentMethod("kenya"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = chargeSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { packageId, phone, provider } = parsed.data;
    const pkg = await Package.findById(packageId);
    if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TXM_${Date.now()}_${user._id.toString().slice(-6)}`;
    const paystackProvider: "mpesa" | "atl" = provider === "airtel" ? "atl" : "mpesa";
    const charge = await chargeMobileMoney({
      email: user.email,
      amountKes: pkg.ksPrice * 100,
      phone: normalizePhone(phone),
      provider: paystackProvider,
      reference
    });
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: pkg.txAmount + pkg.bonusTx,
      ksAmount: pkg.ksPrice,
      paystackRef: charge.reference,
      status: "pending",
      paystackCountry: "kenya",
    });
    res.json({
      reference: charge.reference,
      message: charge.display_text ?? "Check your phone for the payment prompt."
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Charge failed";
    res.status(400).json({ error: message });
  }
});

router.post("/charge-custom", authGuard, banCheck, requirePaymentMethod("kenya"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      txAmount: z.number().min(3),
      ksAmount: z.number().min(15).optional(),
      phone: z.string().min(9),
      provider: z.enum(["mpesa", "airtel"])
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { txAmount, phone, provider } = parsed.data;
    const ksAmount = parsed.data.ksAmount ?? txAmount * TX_RATE_KES;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TXCUSTM_${Date.now()}_${user._id.toString().slice(-6)}`;
    const paystackProvider: "mpesa" | "atl" = provider === "airtel" ? "atl" : "mpesa";
    const charge = await chargeMobileMoney({
      email: user.email,
      amountKes: ksAmount * 100,
      phone: normalizePhone(phone),
      provider: paystackProvider,
      reference
    });
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount,
      ksAmount,
      paystackRef: charge.reference,
      status: "pending",
      paystackCountry: "kenya",
    });
    res.json({
      reference: charge.reference,
      message: charge.display_text ?? "Check your phone for the payment prompt."
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Charge failed";
    res.status(400).json({ error: message });
  }
});

router.get("/charge/status/:reference", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reference = getParam(req.params.reference);
    let status: string;
    try {
      status = await getChargeStatus(reference);
    } catch {
      res.json({ status: "pending" });
      return;
    }
    if (status === "success") {
      const tx = await Transaction.findOne({ paystackRef: reference, userId: req.user!._id });
      if (tx && tx.status === "pending") {
        tx.status = "success";
        await tx.save();
        const user = await User.findById(req.user!._id);
        if (user) {
          user.txCoins += tx.txAmount;
          await user.save();
          notifyOwner(`💰 *Payment Received*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins (KES ${tx.ksAmount})\nMethod: Mobile Money\nRef: \`${reference}\``).catch(() => {});
          createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins (KES ${tx.ksAmount}).`).catch(() => {});
        }
        res.json({ status: "success", txAmount: tx.txAmount });
        return;
      }
      if (tx && tx.status === "success") { res.json({ status: "success", txAmount: tx.txAmount }); return; }
    }
    if (["failed", "abandoned", "cancelled", "reversed"].includes(status)) {
      const tx = await Transaction.findOne({ paystackRef: reference, userId: req.user!._id });
      if (tx && tx.status === "pending") {
        tx.status = "failed";
        await tx.save();
        await recordPaymentFailure(req.user!._id.toString());
      }
      res.json({ status });
      return;
    }
    res.json({ status });
  } catch (err) {
    next(err);
  }
});

router.post("/verify", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { reference } = parsed.data;
    const tx = await Transaction.findOne({ paystackRef: reference, userId: req.user!._id });
    if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
    if (tx.status === "success") { res.json({ success: true, txAmount: tx.txAmount }); return; }
    const isNg = tx.paystackCountry === "nigeria";
    const result = isNg ? await verifyTransactionNg(reference) : await verifyTransaction(reference);
    if (result.success) {
      tx.status = "success";
      await tx.save();
      const user = await User.findById(req.user!._id);
      if (user) {
        user.txCoins += tx.txAmount;
        await user.save();
        const curr = isNg ? "NGN" : "KES";
        notifyOwner(`💰 *Payment Verified*\n\nUser: \`${user.email}\`\nAmount: ${tx.txAmount} Coins (${curr} ${tx.ksAmount})\nRef: \`${reference}\``).catch(() => {});
        createNotification(user._id, "topup", "Top up successful", `You topped up ${tx.txAmount} Coins.`).catch(() => {});
      }
      res.json({ success: true, txAmount: tx.txAmount });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    next(err);
  }
});

router.post("/prepare-card", authGuard, banCheck, requirePaymentMethod("kenya"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = initiateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const pkg = await Package.findById(parsed.data.packageId);
    if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TXCARD_${Date.now()}_${user._id.toString().slice(-6)}`;
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: pkg.txAmount + pkg.bonusTx,
      ksAmount: pkg.ksPrice,
      paystackRef: reference,
      status: "pending",
      paystackCountry: "kenya",
    });
    res.json({ reference });
  } catch (err) {
    next(err);
  }
});

router.post("/initiate-custom", authGuard, banCheck, requirePaymentMethod("kenya"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ txAmount: z.number().min(3), ksAmount: z.number().min(15).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { txAmount } = parsed.data;
    const ksAmount = parsed.data.ksAmount ?? txAmount * TX_RATE_KES;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TXAC_${Date.now()}_${user._id.toString().slice(-6)}`;
    const result = await initializeTransaction(user.email, ksAmount, reference, {
      userId: user._id.toString(),
      txAmount
    });
    if (!result.success) { res.status(500).json({ error: "Failed to initialize payment" }); return; }
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount,
      ksAmount,
      paystackRef: reference,
      status: "pending",
      paystackCountry: "kenya",
    });
    res.json({ accessCode: result.accessCode, reference });
  } catch (err) {
    next(err);
  }
});

router.post("/prepare-card-custom", authGuard, banCheck, requirePaymentMethod("kenya"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ txAmount: z.number().min(3), ksAmount: z.number().min(15).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { txAmount } = parsed.data;
    const ksAmount = parsed.data.ksAmount ?? txAmount * TX_RATE_KES;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TXCCARD_${Date.now()}_${user._id.toString().slice(-6)}`;
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount,
      ksAmount,
      paystackRef: reference,
      status: "pending",
      paystackCountry: "kenya",
    });
    res.json({ reference });
  } catch (err) {
    next(err);
  }
});

export default router;
