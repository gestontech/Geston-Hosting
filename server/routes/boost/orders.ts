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
import {
  placeProviderOrder,
  getProviderOrderStatus,
} from "../../services/boostProvider.js";
import { getCachedServiceById } from "../../services/boostCatalogSync.js";
import {
  normalizeBoostStatus,
  countsAsCompleted,
} from "../../utils/boostStatus.js";
import { notifyOwner } from "../../services/notify.js";

const router = Router();

const orderSchema = z.object({
  serviceId: z.number(),
  link: z.string().url(),
  quantity: z.number().positive(),
});

/**
 * Toutes les commandes de boost sont gratuites pour l'utilisateur.
 *
 * IMPORTANT :
 * - aucun contrôle de txCoins ;
 * - aucun débit de txCoins ;
 * - aucun paiement ;
 * - aucun statut awaiting_payment ;
 * - aucun remboursement de Coins.
 *
 * Le coût enregistré dans l'historique utilisateur est toujours 0.
 */

router.post(
  "/order",
  sessionOrApiKeyGuard,
  banCheck,
  paymentRateLimit,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = orderSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error:
            parsed.error.issues[0]?.message ||
            "Invalid input",
        });
        return;
      }

      const { serviceId, link, quantity } = parsed.data;

      const user = await User.findById(req.user!._id);

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      const service = await getCachedServiceById(serviceId);

      if (!service) {
        res.status(404).json({
          error: "Service not found",
        });
        return;
      }

      if (
        quantity < service.min ||
        quantity > service.max
      ) {
        res.status(400).json({
          error: `Quantity must be between ${service.min} and ${service.max}`,
        });
        return;
      }

      const order = await BoostOrder.create({
        userId: user._id,
        serviceName: service.name,
        category: service.category,
        link,
        quantity,

        // Toujours gratuit.
        costKes: 0,
        costTx: 0,

        // "free" permet de distinguer les anciennes commandes
        // payantes des nouvelles commandes gratuites.
        paymentMethod: "free",

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
        order.status =
          (result.status as typeof order.status) ||
          "pending";

        await order.save();

        await Transaction.create({
          userId: user._id,
          type: "boost",
          txAmount: 0,
          ksAmount: 0,
          status: "success",
        });

        await createNotification(
          user._id,
          "boost",
          "Boost order placed",
          `Your free order for ${quantity} ${service.name} is now ${order.status}.`
        );

        notifyOwner(
          `📈 *Free Boost Order*\n\n` +
            `Order: \`${order._id}\`\n` +
            `User: \`${user.email}\` (@${user.username || "n/a"})\n` +
            `Service: \`${service.name}\`\n` +
            `Category: ${service.category}\n` +
            `Qty: ${quantity}\n` +
            `Link: ${link}\n` +
            `Cost: FREE\n` +
            `Provider order: \`${order.providerOrderId || "n/a"}\`\n` +
            `Status: ${order.status}\n` +
            `Method: FREE${req.viaApiKey ? " (API)" : ""}`
        ).catch(() => {});

        res.json({
          ok: true,
          order: {
            id: order._id,
            status: order.status,
            costTx: 0,
            costKes: 0,
            requiredTx: 0,
            balanceLeft: user.txCoins,
          },
        });
      } catch (providerErr) {
        order.status = "failed";
        await order.save();

        await createNotification(
          user._id,
          "boost",
          "Boost order failed",
          `Your free order for ${service.name} could not be placed.`
        );

        const msg =
          providerErr instanceof Error
            ? providerErr.message
            : "Order failed";

        res.status(502).json({
          error: msg,
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Ancienne route /order/prepare conservée pour compatibilité
 * avec les anciennes versions du frontend.
 *
 * Elle ne prépare plus un paiement.
 * Elle crée directement la commande gratuite.
 */
router.post(
  "/order/prepare",
  sessionOrApiKeyGuard,
  banCheck,
  paymentRateLimit,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = orderSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error:
            parsed.error.issues[0]?.message ||
            "Invalid input",
        });
        return;
      }

      const { serviceId, link, quantity } = parsed.data;

      const service = await getCachedServiceById(serviceId);

      if (!service) {
        res.status(404).json({
          error: "Service not found",
        });
        return;
      }

      if (
        quantity < service.min ||
        quantity > service.max
      ) {
        res.status(400).json({
          error: `Quantity must be between ${service.min} and ${service.max}`,
        });
        return;
      }

      const user = await User.findById(req.user!._id);

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      const order = await BoostOrder.create({
        userId: user._id,
        serviceName: service.name,
        category: service.category,
        link,
        quantity,

        costKes: 0,
        costTx: 0,

        paymentMethod: "free",

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
        order.status =
          (result.status as typeof order.status) ||
          "pending";

        await order.save();

        await Transaction.create({
          userId: user._id,
          type: "boost",
          txAmount: 0,
          ksAmount: 0,
          status: "success",
        });

        await createNotification(
          user._id,
          "boost",
          "Free boost order placed",
          `Your order for ${quantity} ${service.name} is now ${order.status}.`
        );

        notifyOwner(
          `📈 *Free Boost Order*\n\n` +
            `Order: \`${order._id}\`\n` +
            `User: \`${user.email}\` (@${user.username || "n/a"})\n` +
            `Service: \`${service.name}\`\n` +
            `Qty: ${quantity}\n` +
            `Link: ${link}\n` +
            `Cost: FREE\n` +
            `Provider order: \`${order.providerOrderId || "n/a"}\`\n` +
            `Status: ${order.status}`
        ).catch(() => {});

        res.json({
          ok: true,
          boostOrderId: order._id,
          order: {
            id: order._id,
            status: order.status,
          },
          costKes: 0,
          costTx: 0,
          serviceName: service.name,
          paymentRequired: false,
          free: true,
        });
      } catch (providerErr) {
        order.status = "failed";
        await order.save();

        const msg =
          providerErr instanceof Error
            ? providerErr.message
            : "Order failed";

        res.status(502).json({
          error: msg,
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/orders",
  sessionOrApiKeyGuard,
  banCheck,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const orders = await BoostOrder.find({
        userId: req.user!._id,
      })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      const stats = {
        total: orders.length,
        completed: 0,
        pending: 0,
        failed: 0,
        globalCompleted: 3,
      };

      for (const order of orders) {
        if (countsAsCompleted(order.status)) {
          stats.completed++;
        } else if (
          order.status === "failed" ||
          order.status === "refunded"
        ) {
          stats.failed++;
        } else {
          stats.pending++;
        }
      }

      const realCompleted = await BoostOrder.countDocuments({
        status: {
          $in: ["completed", "partial"],
        },
      })
        .maxTimeMS(3000)
        .catch(() => 0);

      const realPlaced = await BoostOrder.countDocuments({
        status: {
          $nin: ["failed", "refunded"],
        },
      })
        .maxTimeMS(3000)
        .catch(() => 0);

      stats.globalCompleted =
        3 + Math.max(realCompleted, 0);

      if (
        stats.globalCompleted === 3 &&
        realPlaced > 0
      ) {
        stats.globalCompleted = 3 + realPlaced;
      }

      res.json({
        orders,
        stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/orders/:id/refresh",
  sessionOrApiKeyGuard,
  banCheck,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const order = await BoostOrder.findOne({
        _id: req.params.id,
        userId: req.user!._id,
      });

      if (!order) {
        res.status(404).json({
          error: "Order not found",
        });
        return;
      }

      if (
        !order.providerOrderId ||
        ["completed", "failed", "refunded"].includes(
          order.status
        )
      ) {
        res.json({
          status: order.status,
        });
        return;
      }

      const providerStatus =
        await getProviderOrderStatus(
          order.providerOrderId
        );

      if (providerStatus.status) {
        const mapped = normalizeBoostStatus(
          providerStatus.status,
          order.status as any
        );

        if (mapped !== order.status) {
          order.status = mapped;
          order.updatedAt = new Date();

          await order.save();

          if (order.status === "completed") {
            await createNotification(
              order.userId,
              "boost",
              "Boost order completed",
              `Your free order for ${order.serviceName} is complete.`
            );

            notifyOwner(
              `✅ *Free Boost Order Completed*\n\n` +
                `Order: \`${order._id}\`\n` +
                `Service: \`${order.serviceName}\`\n` +
                `Qty: ${order.quantity}\n` +
                `Link: ${order.link}\n` +
                `Provider order: \`${order.providerOrderId || "n/a"}\``
            ).catch(() => {});
          }
        }
      }

      res.json({
        status: order.status,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
