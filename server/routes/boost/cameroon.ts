import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { User } from "../../models/User.js";
import { BoostOrder } from "../../models/BoostOrder.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { sessionOrApiKeyGuard } from "../../middleware/sessionOrApiKey.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { isCameroonAvailable, initiateFapshiDirectPay, getFapshiPaymentStatus } from "../../services/fapshi.js";
import { fulfillPaidBoostOrder } from "../../services/boostFulfillment.js";
import { getParam, loadAwaitingOrder } from "./shared.js";
import { requirePaymentMethod } from "../../lib/featureFlags.js";

const router = Router();

router.post("/order/pay/cameroon", sessionOrApiKeyGuard, banCheck, requirePaymentMethod("cameroon"), paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isCameroonAvailable()) { res.status(503).json({ error: "Cameroon payments are not available." }); return; }
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

    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const externalId = `BOOSTCM_${Date.now()}_${user._id.toString().slice(-6)}`;
    const result = await initiateFapshiDirectPay({
      amount,
      phone,
      email: user.email,
      externalId,
      message: `Geston Hosting: ${order.serviceName}`,
    });
    if (!result.success || !result.transId) {
      res.status(500).json({ error: result.message || "Failed to initiate payment" });
      return;
    }

    order.paymentGateway = "cameroon";
    order.paymentRef = result.transId;
    await order.save();

    res.json({ transId: result.transId });
  } catch (err) {
    next(err);
  }
});

router.get("/order/pay/cameroon/status/:transId", sessionOrApiKeyGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const transId = getParam(req.params.transId);
    const order = await BoostOrder.findOne({ userId: req.user!._id, paymentRef: transId, paymentGateway: "cameroon" });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.status !== "awaiting_payment") { res.json({ status: order.status }); return; }

    const result = await getFapshiPaymentStatus(transId);
    if (!result.success) { res.json({ status: "awaiting_payment" }); return; }
    if (result.status === "SUCCESSFUL") {
      await fulfillPaidBoostOrder(String(order._id));
      const fresh = await BoostOrder.findById(order._id);
      res.json({ status: fresh?.status || "pending" });
      return;
    }
    if (result.status === "FAILED" || result.status === "EXPIRED") {
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
