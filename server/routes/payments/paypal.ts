import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { User } from "../../models/User.js";
import { authGuard, type AuthRequest } from "../../middleware/auth.js";
import { banCheck } from "../../middleware/banCheck.js";
import { notifyOwner } from "../../services/notify.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/notify-paypal-proof", authGuard, banCheck, requirePaymentMethod("paypal"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      senderEmail: z.string().email(),
      txAmount: z.number().min(1).max(10000),
      paypalTransactionId: z.string().min(1).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { senderEmail, txAmount, paypalTransactionId } = parsed.data;
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    notifyOwner(
      `💳 *PayPal Payment Proof Submitted*\n\nUser: \`${user.email}\`\nPayPal Sender: \`${senderEmail}\`\nTX Expected: *${txAmount} Coins*\nPayPal Tx ID: \`${paypalTransactionId}\`\n\n⚠️ Verify on PayPal then credit Coins manually.`
    ).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
