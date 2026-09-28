import { Router } from "express";
import { BoostOrder } from "../../models/BoostOrder.js";
import { User } from "../../models/User.js";
import { BoostServiceCache } from "../../models/BoostServiceCache.js";
import {
  syncBoostCatalogue,
  clearBoostCatalogue,
  getCatalogueMeta,
} from "../../services/boostCatalogSync.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get(
  "/boost-orders",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(
        1,
        parseInt(String(req.query.page || "1"), 10) || 1
      );

      const limit = Math.min(
        100,
        Math.max(
          1,
          parseInt(String(req.query.limit || "50"), 10) || 50
        )
      );

      const status =
        typeof req.query.status === "string"
          ? req.query.status
          : "";

      const q =
        typeof req.query.q === "string"
          ? req.query.q.trim()
          : "";

      const filter: Record<string, unknown> = {};

      if (status) {
        filter.status = status;
      }

      if (q) {
        const escaped = q.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const users = await User.find({
          $or: [
            {
              email: {
                $regex: escaped,
                $options: "i",
              },
            },
            {
              username: {
                $regex: escaped,
                $options: "i",
              },
            },
          ],
        })
          .select("_id")
          .limit(50)
          .lean();

        const userIds = users.map((u) => u._id);

        filter.$or = [
          {
            serviceName: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            link: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            providerOrderId: {
              $regex: escaped,
              $options: "i",
            },
          },
          {
            category: {
              $regex: escaped,
              $options: "i",
            },
          },
          ...(userIds.length
            ? [{ userId: { $in: userIds } }]
            : []),
        ];
      }

      const skip = (page - 1) * limit;

      const [
        orders,
        total,
        completed,
        pending,
        failed,
        processing,
      ] = await Promise.all([
        BoostOrder.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("userId", "email username")
          .lean(),

        BoostOrder.countDocuments(filter).maxTimeMS(5000),

        BoostOrder.countDocuments({
          status: {
            $in: ["completed", "partial"],
          },
        }).maxTimeMS(3000),

        BoostOrder.countDocuments({
          status: {
            $in: ["pending", "awaiting_payment"],
          },
        }).maxTimeMS(3000),

        BoostOrder.countDocuments({
          status: {
            $in: ["failed", "refunded"],
          },
        }).maxTimeMS(3000),

        BoostOrder.countDocuments({
          status: {
            $in: ["processing"],
          },
        }).maxTimeMS(3000),
      ]);

      const mapped = orders.map(
        (o: Record<string, unknown>) => {
          const u = o.userId as {
            _id?: unknown;
            email?: string;
            username?: string;
          } | null;

          return {
            _id: o._id,
            serviceName: o.serviceName,
            category: o.category,
            link: o.link,
            quantity: o.quantity,

            costKes: 0,
            costTx: 0,

            paymentMethod: "free",

            providerOrderId: o.providerOrderId,
            providerServiceId: o.providerServiceId,
            status: o.status,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,

            user: u
              ? {
                  id: u._id,
                  email: u.email || "",
                  username: u.username || "",
                }
              : null,
          };
        }
      );

      res.json({
        orders: mapped,
        total,
        page,
        limit,
        stats: {
          total,
          completed,
          pending,
          failed,
          processing,
          globalCompleted: 3 + completed,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/boost-orders/:id/complete",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await BoostOrder.findById(req.params.id);

      if (!order) {
        res.status(404).json({
          error: "Order not found",
        });
        return;
      }

      if (
        ["completed", "refunded"].includes(order.status)
      ) {
        res.json({
          ok: true,
          status: order.status,
          message: "Already final",
        });
        return;
      }

      order.status = "completed";
      order.updatedAt = new Date();

      await order.save();

      try {
        const {
          createNotification,
        } = await import(
          "../../services/notifications.js"
        );

        await createNotification(
          order.userId,
          "boost",
          "Boost order completed",
          `Your order for ${order.serviceName} is complete.`
        );
      } catch {}

      try {
        const {
          notifyOwner,
        } = await import(
          "../../services/notify.js"
        );

        notifyOwner(
          `✅ *Boost marked completed (admin)*\n\n` +
            `Order: \`${order._id}\`\n` +
            `Service: \`${order.serviceName}\`\n` +
            `Qty: ${order.quantity}\n` +
            `Link: ${order.link}`
        ).catch(() => {});
      } catch {}

      res.json({
        ok: true,
        status: "completed",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/api-keys",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await User.find({
        apiKeyHash: { $ne: "" },
      })
        .select(
          "email username apiKeyPrefix apiKeyActive apiKeyCreatedAt apiKeyLastUsedAt apiCallCount isBanned createdAt"
        )
        .sort({
          apiKeyLastUsedAt: -1,
          apiCallCount: -1,
        })
        .lean();

      const userIds = users.map((u) => u._id);

      const boostByApi = await BoostOrder.aggregate([
        {
          $match: {
            userId: { $in: userIds },
          },
        },
        {
          $group: {
            _id: "$userId",
            orders: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$status", "completed"],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const orderMap: Record<
        string,
        {
          orders: number;
          completed: number;
        }
      > = {};

      for (const row of boostByApi) {
        orderMap[String(row._id)] = {
          orders: row.orders,
          completed: row.completed,
        };
      }

      const mapped = users.map((u) => ({
        id: u._id,
        email: u.email,
        username: u.username || "",
        prefix: u.apiKeyPrefix || "",
        active: !!u.apiKeyActive,
        callCount: u.apiCallCount || 0,
        lastUsedAt: u.apiKeyLastUsedAt || null,
        createdAt: u.apiKeyCreatedAt || null,
        isBanned: !!u.isBanned,
        boostOrders:
          orderMap[String(u._id)]?.orders || 0,
        boostCompleted:
          orderMap[String(u._id)]?.completed || 0,
      }));

      const stats = {
        totalKeys: mapped.length,
        activeKeys: mapped.filter((m) => m.active).length,
        totalCalls: mapped.reduce(
          (sum, m) => sum + m.callCount,
          0
        ),
        totalBoostOrders: mapped.reduce(
          (sum, m) => sum + m.boostOrders,
          0
        ),
      };

      res.json({
        keys: mapped,
        stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/boost-catalogue/meta",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const meta = getCatalogueMeta();

      let mongoCount = 0;

      try {
        mongoCount = await BoostServiceCache
          .countDocuments()
          .maxTimeMS(3000);
      } catch {}

      res.json({
        ...meta,
        mongoCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/boost-catalogue/sync",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await syncBoostCatalogue();

      if (!result) {
        res.status(502).json({
          error:
            "Catalogue sync returned no services. Try again shortly.",
        });
        return;
      }

      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Sync failed";

      res.status(502).json({
        error: msg,
      });
    }
  }
);

router.delete(
  "/boost-catalogue",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await clearBoostCatalogue();

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
