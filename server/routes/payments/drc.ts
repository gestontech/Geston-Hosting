import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";
import {
  createOPTCheckoutSession,
  generateOPTReference,
  isOPTGatewayAvailable,
} from "../../services/optgateway.js";

const router = Router();

function getPublicUrl(req: Request): string {
  return (
    process.env.APP_URL ||
    process.env.CLIENT_URL ||
    process.env.SITE_URL ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
}

router.post(
  "/initiate-drc",
  authGuard,
  banCheck,
  requirePaymentMethod("drc"),
  paymentRateLimit,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!isOPTGatewayAvailable()) {
        res.status(503).json({ error: "Le paiement OPTGateway n'est pas encore configuré." });
        return;
      }

      const schema = z.object({
        amount: z.number().positive().max(5000),
        currency: z.enum(["USD", "CDF"]).default("USD"),
        txAmount: z.number().int().min(1),
        bonusTx: z.number().int().min(0).default(0),
        phone: z.string().min(8).max(20).optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides." });
        return;
      }

      const { amount, currency, txAmount, bonusTx, phone } = parsed.data;
      const user = await User.findById(req.user!._id);

      if (!user) {
        res.status(404).json({ error: "Utilisateur introuvable." });
        return;
      }

      const reference = generateOPTReference();
      const publicUrl = getPublicUrl(req);

      const session = await createOPTCheckoutSession({
        amount,
        currency,
        reference,
        phone,
        description: `Geston Hosting — ${txAmount + bonusTx} Coins`,
        returnUrl: `${publicUrl}/dashboard?payment=return&reference=${encodeURIComponent(reference)}`,
        cancelUrl: `${publicUrl}/topup?payment=cancelled&reference=${encodeURIComponent(reference)}`,
      });

      if (!session.success) {
        res.status(502).json({ error: session.message });
        return;
      }

      await Transaction.create({
        userId: user._id,
        type: "topup",
        txAmount: txAmount + bonusTx,
        ksAmount: amount,
        paystackRef: reference,
        status: "pending",
        paystackCountry: "drc",
      });

      res.status(201).json({
        checkoutUrl: session.url,
        reference,
        sessionId: session.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
