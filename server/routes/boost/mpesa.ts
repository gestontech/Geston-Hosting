import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { User } from "../../models/User.js";
import { BoostOrder } from "../../models/BoostOrder.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { sessionOrApiKeyGuard } from "../../middleware/sessionOrApiKey.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { chargeMobileMoney, getChargeStatus, normalizePhone } from "../../services/paystack.js";
import { fulfillPaidBoostOrder } from "../../services/boostFulfillment.js";
import { getParam, loadAwaitingOrder } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/order/pay/mpesa", sessionOrApiKeyGuard, banCheck, requirePaymentMethod("kenya"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      boostOrderId: z.string(),
      phone: z.string().min(9),
      provider: z.enum(["mpesa", "airtel"]).default("mpesa"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { boostOrderId, phone, provider } = parsed.data;

    const order = await loadAwaitingOrder(String(req.user!._id), boostOrderId);
    if (!order) { res.status(404).json({ error: "Order not found or already paid" }); return; }

    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const reference = `BOOST_${Date.now()}_${user._id.toString().slice(-6)}`;
    const paystackProvider: "mpesa" | "atl" = provider === "airtel" ? "atl" : "mpesa";
    const charge = await chargeMobileMoney({
      email: user.email,
      amountKes: Math.round(order.costKes * 100),
      phone: normalizePhone(phone),
      provider: paystackProvider,
      reference,
    });

    order.paymentGateway = "mpesa";
    order.paymentRef = charge.reference;
    await order.save();

    res.json({ reference: charge.reference, message: charge.display_text ?? "Check your phone for the payment prompt." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Charge failed";
    res.status(400).json({ error: message });
  }
});

router.get("/order/pay/mpesa/status/:reference", sessionOrApiKeyGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reference = getParam(req.params.reference);
    const order = await BoostOrder.findOne({ userId: req.user!._id, paymentRef: reference, paymentGateway: "mpesa" });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.status !== "awaiting_payment") { res.json({ status: order.status }); return; }

    const status = await getChargeStatus(reference);
    if (status === "success") {
      await fulfillPaidBoostOrder(String(order._id));
      const fresh = await BoostOrder.findById(order._id);
      res.json({ status: fresh?.status || "pending" });
      return;
    }
    if (status === "failed" || status === "abandoned") {
      order.status = "failed";
      await order.save();
      res.json({ status: "failed" });
      return;
    }
    res.json({ status: "awaiting_payment" });
  } catch (err) {
    next(err);
  }
});

export default router;
