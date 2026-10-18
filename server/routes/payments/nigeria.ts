import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { initializeTransactionNg, isNigeriaAvailable } from "../../services/paystack.js";
import { initiateNgSchema } from "../../lib/paymentSchemas.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/initiate-ng", authGuard, banCheck, requirePaymentMethod("nigeria"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isNigeriaAvailable()) { res.status(503).json({ error: "Nigeria payments are not available." }); return; }
    const parsed = initiateNgSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { ngnAmount, txAmount, bonusTx, packageName } = parsed.data;
    const totalTx = txAmount + bonusTx;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TXNG_${Date.now()}_${user._id.toString().slice(-6)}`;
    const result = await initializeTransactionNg(user.email, ngnAmount, reference, {
      packageName: packageName || "Nigeria Package",
      userId: user._id.toString(),
      txAmount: totalTx,
    });
    if (!result.success) { res.status(500).json({ error: "Failed to initialize payment" }); return; }
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: totalTx,
      ksAmount: ngnAmount,
      paystackRef: reference,
      status: "pending",
      paystackCountry: "nigeria",
    });
    res.json({ authorizationUrl: result.authorizationUrl, accessCode: result.accessCode, reference });
  } catch (err) {
    next(err);
  }
});

router.post("/prepare-card-ng", authGuard, banCheck, requirePaymentMethod("nigeria"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isNigeriaAvailable()) { res.status(503).json({ error: "Nigeria payments are not available." }); return; }
    const schema = z.object({
      ngnAmount: z.number().min(100),
      txAmount: z.number().min(1),
      bonusTx: z.number().min(0).default(0),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { ngnAmount, txAmount, bonusTx } = parsed.data;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const reference = `TXNGCARD_${Date.now()}_${user._id.toString().slice(-6)}`;
    await Transaction.create({
      userId: user._id,
      type: "topup",
      txAmount: txAmount + bonusTx,
      ksAmount: ngnAmount,
      paystackRef: reference,
      status: "pending",
      paystackCountry: "nigeria",
    });
    res.json({ reference });
  } catch (err) {
    next(err);
  }
});

export default router;
