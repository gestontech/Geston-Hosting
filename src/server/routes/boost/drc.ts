import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { BoostOrder } from "../../models/BoostOrder.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { sessionOrApiKeyGuard } from "../../middleware/sessionOrApiKey.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { isDRCAvailable, initiateWonyaPayment, getWonyaPaymentStatus, normalizeDRCPhone } from "../../services/wonyapay.js";
import { fulfillPaidBoostOrder } from "../../services/boostFulfillment.js";
import { getParam, loadAwaitingOrder } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/order/pay/drc", sessionOrApiKeyGuard, banCheck, requirePaymentMethod("drc"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isDRCAvailable()) { res.status(503).json({ error: "DRC payments are not available." }); return; }
    const schema = z.object({
      boostOrderId: z.string(),
      phone: z.string().min(8).max(16),
      currency: z.enum(["CDF", "USD"]).default("USD"),
      amount: z.number().positive(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const { boostOrderId, currency, amount } = parsed.data;

    const order = await loadAwaitingOrder(String(req.user!._id), boostOrderId);
    if (!order) { res.status(404).json({ error: "Order not found or already paid" }); return; }

    const phone = normalizeDRCPhone(parsed.data.phone);
    if (!phone) { res.status(400).json({ error: "Enter a valid DR Congo mobile number (e.g. 0997654321)" }); return; }

    const result = await initiateWonyaPayment({ amount, currency, phone, reason: `GESTONX: ${order.serviceName}` });
    if (!result.success || !result.refTransa) {
      res.status(500).json({ error: result.message || "Failed to initiate payment" });
      return;
    }

    order.paymentGateway = "drc";
    order.paymentRef = result.refTransa;
    await order.save();

    res.json({ refTransa: result.refTransa });
  } catch (err) {
    next(err);
  }
});

router.get("/order/pay/drc/status/:refTransa", sessionOrApiKeyGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refTransa = getParam(req.params.refTransa);
    const order = await BoostOrder.findOne({ userId: req.user!._id, paymentRef: refTransa, paymentGateway: "drc" });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.status !== "awaiting_payment") { res.json({ status: order.status }); return; }

    const result = await getWonyaPaymentStatus(refTransa);
    if (!result.success) { res.json({ status: "awaiting_payment" }); return; }
    if (result.status === "completed") {
      await fulfillPaidBoostOrder(String(order._id));
      const fresh = await BoostOrder.findById(order._id);
      res.json({ status: fresh?.status || "pending" });
      return;
    }
    if (result.status === "failed") {
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
