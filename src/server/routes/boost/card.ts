import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { BoostOrder } from "../../models/BoostOrder.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { sessionOrApiKeyGuard } from "../../middleware/sessionOrApiKey.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { initializeTransaction, verifyTransaction } from "../../services/paystack.js";
import { fulfillPaidBoostOrder } from "../../services/boostFulfillment.js";
import { loadAwaitingOrder } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/order/pay/card", sessionOrApiKeyGuard, banCheck, requirePaymentMethod("card"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ boostOrderId: z.string(), email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { boostOrderId, email } = parsed.data;

    const order = await loadAwaitingOrder(String(req.user!._id), boostOrderId);
    if (!order) { res.status(404).json({ error: "Order not found or already paid" }); return; }

    const reference = `BOOSTCARD_${Date.now()}_${req.user!._id.toString().slice(-6)}`;
    order.paymentGateway = "card";
    order.paymentRef = reference;
    await order.save();

    res.json({ reference, email });
  } catch (err) {
    next(err);
  }
});

router.post("/order/pay/card/init", sessionOrApiKeyGuard, banCheck, requirePaymentMethod("card"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ boostOrderId: z.string(), email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { boostOrderId, email } = parsed.data;

    const order = await loadAwaitingOrder(String(req.user!._id), boostOrderId);
    if (!order) { res.status(404).json({ error: "Order not found or already paid" }); return; }

    const reference = `BOOSTAPAY_${Date.now()}_${req.user!._id.toString().slice(-6)}`;
    const result = await initializeTransaction(email, order.costKes, reference, { boostOrderId: String(order._id) });
    if (!result.success || !result.accessCode) { res.status(500).json({ error: "Failed to initialize payment" }); return; }

    order.paymentGateway = "card";
    order.paymentRef = reference;
    await order.save();

    res.json({ accessCode: result.accessCode, reference });
  } catch (err) {
    next(err);
  }
});

router.post("/order/pay/card/verify", sessionOrApiKeyGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ reference: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { reference } = parsed.data;

    const order = await BoostOrder.findOne({ userId: req.user!._id, paymentRef: reference, paymentGateway: "card" });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.status !== "awaiting_payment") { res.json({ success: true, status: order.status }); return; }

    const result = await verifyTransaction(reference);
    if (!result.success) { res.json({ success: false }); return; }

    await fulfillPaidBoostOrder(String(order._id));
    const fresh = await BoostOrder.findById(order._id);
    res.json({ success: true, status: fresh?.status || "pending" });
  } catch (err) {
    next(err);
  }
});

export default router;
