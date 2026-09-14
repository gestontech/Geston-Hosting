import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { BoostOrder } from "../../models/BoostOrder.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { sessionOrApiKeyGuard } from "../../middleware/sessionOrApiKey.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { isTanzaniaAvailable, initiateSpeedPesaPayment, getSpeedPesaPaymentStatus } from "../../services/speedpesa.js";
import { fulfillPaidBoostOrder } from "../../services/boostFulfillment.js";
import { getParam, loadAwaitingOrder } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/order/pay/tanzania", sessionOrApiKeyGuard, banCheck, requirePaymentMethod("tanzania"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isTanzaniaAvailable()) { res.status(503).json({ error: "Tanzania payments are not available." }); return; }
    const schema = z.object({
      boostOrderId: z.string(),
      phone: z.string().min(8).max(16),
      amount: z.number().positive(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { boostOrderId, phone, amount } = parsed.data;

    const order = await loadAwaitingOrder(String(req.user!._id), boostOrderId);
    if (!order) { res.status(404).json({ error: "Order not found or already paid" }); return; }

    const result = await initiateSpeedPesaPayment({ phonenumber: phone, amount });
    if (!result.success || !result.reference) {
      res.status(500).json({ error: result.message || "Failed to initiate payment" });
      return;
    }

    order.paymentGateway = "tanzania";
    order.paymentRef = result.reference;
    await order.save();

    res.json({ reference: result.reference });
  } catch (err) {
    next(err);
  }
});

router.get("/order/pay/tanzania/status/:reference", sessionOrApiKeyGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reference = getParam(req.params.reference);
    const order = await BoostOrder.findOne({ userId: req.user!._id, paymentRef: reference, paymentGateway: "tanzania" });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.status !== "awaiting_payment") { res.json({ status: order.status }); return; }

    const result = await getSpeedPesaPaymentStatus(reference);
    if (!result.success) { res.json({ status: "awaiting_payment" }); return; }
    if (result.status === "SUCCESS") {
      await fulfillPaidBoostOrder(String(order._id));
      const fresh = await BoostOrder.findById(order._id);
      res.json({ status: fresh?.status || "pending" });
      return;
    }
    if (result.status === "FAILED") {
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
