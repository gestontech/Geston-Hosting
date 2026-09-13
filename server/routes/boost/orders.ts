import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { User } from "../../models/User.js";
import { Transaction } from "../../models/Transaction.js";
import { BoostOrder } from "../../models/BoostOrder.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { sessionOrApiKeyGuard } from "../../middleware/sessionOrApiKey.js";
import { banCheck } from "../../middleware/banCheck.js";
import { paymentRateLimit } from "../../middleware/rateLimit.js";
import { createNotification } from "../../services/notifications.js";
import { placeProviderOrder, getProviderOrderStatus } from "../../services/boostProvider.js";
import { getCachedServiceById } from "../../services/boostCatalogSync.js";
import { normalizeBoostStatus, countsAsCompleted } from "../../utils/boostStatus.js";
import { sellPriceKesPer1000 } from "../../utils/boostPricing.js";
import { notifyOwner } from "../../services/notify.js";

const router = Router();

const TX_RATE_KES = 5;

const orderSchema = z.object({
  serviceId: z.number(),
  link: z.string().url(),
  quantity: z.number().positive(),
});

router.post("/order", sessionOrApiKeyGuard, banCheck, paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { serviceId, link, quantity } = parsed.data;

    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (!user.isModerator && !req.viaApiKey) {
      res.status(403).json({ error: "Coins payment isn't available for boosting on the website. Use /boost/order/prepare to pay directly.", code: "TX_NOT_ALLOWED" });
      return;
    }

    const service = await getCachedServiceById(serviceId);
    if (!service) { res.status(404).json({ error: "Service not found" }); return; }
    if (quantity < service.min || quantity > service.max) {
      res.status(400).json({ error: `Quantity must be between ${service.min} and ${service.max}` });
      return;
    }

    const sellKesPer1000 = sellPriceKesPer1000(service.baseKesPer1000);
    const costKes = Math.round((sellKesPer1000 / 1000) * quantity * 100) / 100;
    const costTx = Math.max(1, Math.ceil(costKes / TX_RATE_KES));

    if (user.txCoins < costTx) {
      res.status(402).json({
        error: `Insufficient Coins balance. This order costs ${costTx} Coins but you only have ${user.txCoins} Coins. Top up at /topup then retry.`,
        code: "INSUFFICIENT_COINS",
        requiredTx: costTx,
        balanceTx: user.txCoins,
        shortfallTx: costTx - user.txCoins,
      });
      return;
    }

    user.txCoins -= costTx;
    await user.save();

    const order = await BoostOrder.create({
      userId: user._id,
      serviceName: service.name,
      category: service.category,
      link,
      quantity,
      costKes,
      costTx,
      paymentMethod: "tx",
      providerServiceId: service.providerId,
      providerCode: service.provider,
      status: "pending",
    });

    try {
      const result = await placeProviderOrder({
        service_id: service.providerId,
        provider: service.provider,
        link,
        quantity,
      });
      order.providerOrderId = String(result.order_id);
      order.status = (result.status as typeof order.status) || "pending";
      await order.save();

      await Transaction.create({ userId: user._id, type: "boost", txAmount: costTx, ksAmount: costKes, status: "success" });
      await createNotification(user._id, "boost", "Boost order placed", `Your order for ${quantity} ${service.name} is now ${order.status}.`);
      notifyOwner(
        `📈 *Boost Order (Coins)*\n\n` +
        `Order: \`${order._id}\`\n` +
        `User: \`${user.email}\` (@${user.username || "n/a"})\n` +
        `Service: \`${service.name}\`\n` +
        `Category: ${service.category}\n` +
        `Qty: ${quantity}\n` +
        `Link: ${link}\n` +
        `Cost: ${costTx} Coins (KES ${costKes})\n` +
        `Provider order: \`${order.providerOrderId || "n/a"}\`\n` +
        `Status: ${order.status}\n` +
        `Method: Coins${req.viaApiKey ? " (API)" : ""}`
      ).catch(() => {});

      res.json({ ok: true, order: { id: order._id, status: order.status, costTx, costKes, requiredTx: costTx, balanceLeft: user.txCoins } });
    } catch (providerErr) {
      user.txCoins += costTx;
      await user.save();
      order.status = "refunded";
      await order.save();
      await createNotification(user._id, "refund", "Boost order failed", `Your order for ${service.name} couldn't be placed and your ${costTx} Coins was refunded.`);
      const msg = providerErr instanceof Error ? providerErr.message : "Order failed";
      res.status(502).json({ error: msg });
    }
  } catch (err) {
    next(err);
  }
});

router.post("/order/prepare", sessionOrApiKeyGuard, banCheck, paymentRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { serviceId, link, quantity } = parsed.data;

    const service = await getCachedServiceById(serviceId);
    if (!service) { res.status(404).json({ error: "Service not found" }); return; }
    if (quantity < service.min || quantity > service.max) {
      res.status(400).json({ error: `Quantity must be between ${service.min} and ${service.max}` });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const sellKesPer1000 = sellPriceKesPer1000(service.baseKesPer1000);
    const costKes = Math.round((sellKesPer1000 / 1000) * quantity * 100) / 100;

    const order = await BoostOrder.create({
      userId: user._id,
      serviceName: service.name,
      category: service.category,
      link,
      quantity,
      costKes,
      costTx: Math.max(1, Math.ceil(costKes / TX_RATE_KES)),
      paymentMethod: "direct",
      providerServiceId: service.providerId,
      providerCode: service.provider,
      status: "awaiting_payment",
    });

    res.json({ boostOrderId: order._id, costKes, serviceName: service.name });
  } catch (err) {
    next(err);
  }
});

router.get("/orders", sessionOrApiKeyGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await BoostOrder.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(200).lean();
    const stats = { total: orders.length, completed: 0, pending: 0, failed: 0, globalCompleted: 3 };
    for (const o of orders) {
      if (countsAsCompleted(o.status)) stats.completed++;
      else if (o.status === "failed" || o.status === "refunded") stats.failed++;
      else if (o.status !== "awaiting_payment") stats.pending++;
    }
    const realCompleted = await BoostOrder.countDocuments({ status: { $in: ["completed", "partial"] } }).maxTimeMS(3000).catch(() => 0);
    const realPlaced = await BoostOrder.countDocuments({ status: { $nin: ["awaiting_payment", "failed", "refunded"] } }).maxTimeMS(3000).catch(() => 0);
    stats.globalCompleted = 3 + Math.max(realCompleted, 0);
    if (stats.globalCompleted === 3 && realPlaced > 0) {
      stats.globalCompleted = 3 + realPlaced;
    }
    res.json({ orders, stats });
  } catch (err) {
    next(err);
  }
});

router.get("/orders/:id/refresh", sessionOrApiKeyGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await BoostOrder.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (!order.providerOrderId || ["completed", "failed", "refunded"].includes(order.status)) {
      res.json({ status: order.status });
      return;
    }
    const providerStatus = await getProviderOrderStatus(order.providerOrderId);
    if (providerStatus.status) {
      const mapped = normalizeBoostStatus(providerStatus.status, order.status as any);
      if (mapped !== order.status) {
        order.status = mapped;
        order.updatedAt = new Date();
        await order.save();
        if (order.status === "completed") {
          await createNotification(order.userId, "boost", "Boost order completed", `Your order for ${order.serviceName} is complete.`);
          notifyOwner(
            `✅ *Boost Order Completed*\n\n` +
            `Order: \`${order._id}\`\n` +
            `Service: \`${order.serviceName}\`\n` +
            `Qty: ${order.quantity}\n` +
            `Link: ${order.link}\n` +
            `Provider order: \`${order.providerOrderId || "n/a"}\``
          ).catch(() => {});
        }
      }
    }
    res.json({ status: order.status });
  } catch (err) {
    next(err);
  }
});

export default router;
