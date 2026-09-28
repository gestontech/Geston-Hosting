import { Router } from "express";
import { z } from "zod";
import { Panel } from "../models/Panel.js";
import { PanelPlan } from "../models/PanelPlan.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { notifyOwner } from "../services/notify.js";
import { createNotification } from "../services/notifications.js";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { IUser } from "../models/User.js";
import { JWT_SECRET } from "../lib/env.js";
import { isServiceDisabled } from "../lib/featureFlags.js";
import {
  findPanelUser,
  createPanelUser,
  updatePanelUserPassword,
  promoteToAdmin,
  getFreeAllocation,
  createPanelServer,
} from "../services/pterodactyl.js";

const router = Router();

router.use(async (_req, res, next) => {
  if (await isServiceDisabled("panels")) {
    res.status(503).json({
      error: "Panels are currently disabled",
      serviceDisabled: "panels",
    });
    return;
  }

  next();
});

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

interface AdminReq extends Request {
  user?: IUser;
}

async function adminAuth(
  req: AdminReq,
  res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
    };

    const user = await User.findById(decoded.userId).lean();

    if (
      !user ||
      (user.email || "").toLowerCase() !== ADMIN_EMAIL
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    req.user = user as unknown as IUser;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function isUnlimited(str: string): boolean {
  if (!str) return false;

  const lower = str.toLowerCase().trim();

  return (
    lower.includes("unlimited") ||
    lower === "0" ||
    lower.includes("∞") ||
    lower === "0mb" ||
    lower === "0gb" ||
    lower === "0%"
  );
}

function parseMb(str: string): number {
  if (!str) return 512;
  if (isUnlimited(str)) return 0;

  const lower = str.toLowerCase().trim();
  const m = lower.match(/^([\d.]+)\s*(mb|gb)?/);

  if (!m) return 512;

  const value = parseFloat(m[1]);

  if (Number.isNaN(value)) return 512;
  if (value === 0) return 0;

  return m[2] === "gb"
    ? Math.round(value * 1024)
    : Math.round(value);
}

function parseCpu(str: string): number {
  if (!str) return 100;
  if (isUnlimited(str)) return 0;

  const m = str.match(/^(\d+)/);

  return m ? parseInt(m[1]) : 100;
}

function resolvePanelDomain(): string {
  return (process.env.PANEL_DOMAIN || "").replace(/\/$/, "");
}

/**
 * Get available panel plans.
 *
 * Plans remain available normally, but their cost is no longer
 * used to authorize or charge users.
 */
router.get(
  "/plans",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await PanelPlan.find({
        active: true,
      })
        .sort({ order: 1 })
        .lean();

      res.json(
        plans.map((plan) => ({
          ...plan,
          txCost: 0,
          originalTxCost: 0,
          free: true,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/my",
  authGuard,
  banCheck,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const panels = await Panel.find({
        userId: req.user!._id,
      })
        .sort({ purchasedAt: -1 })
        .lean();

      res.json(
        panels.map((panel) => ({
          ...panel,
          txCost: 0,
          free: true,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Purchase a panel for FREE.
 *
 * Important:
 * - No Coins check.
 * - No Coins deduction.
 * - No payment method.
 * - Direct API calls are also free.
 */
router.post(
  "/purchase",
  authGuard,
  banCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const schema = z.object({
        planId: z.string(),
        panelEmail: z.string().email().optional(),
        panelUsername: z
          .string()
          .min(3)
          .max(32)
          .regex(
            /^[a-z0-9_]+$/,
            "Username must be lowercase letters, numbers, or underscores"
          )
          .optional(),
        panelPassword: z.string().min(6).optional(),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error:
            parsed.error.issues[0]?.message ||
            "Invalid input",
        });
        return;
      }

      const plan = await PanelPlan.findById(
        parsed.data.planId
      );

      if (!plan || !plan.active) {
        res.status(404).json({
          error: "Plan not found",
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

      const panelDomain = resolvePanelDomain();

      if (!panelDomain) {
        res.status(500).json({
          error: "PANEL_DOMAIN is not configured",
        });
        return;
      }

      const panelLoginUrl = `${panelDomain}/auth/login`;

      const suffix = Math.floor(
        1000 + Math.random() * 9000
      );

      const base = (
        user.username ||
        user.email.split("@")[0]
      )
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase()
        .slice(0, 12);

      const defaultUsername = `${base}${suffix}`;

      const panelEmail =
        parsed.data.panelEmail || user.email;

      const panelUsername =
        parsed.data.panelUsername ||
        defaultUsername;

      const panelPassword =
        parsed.data.panelPassword ||
        `${base}@${Math.floor(
          1000 + Math.random() * 9000
        )}`;

      /*
       * Pterodactyl provisioning remains active.
       * Only payment has been removed.
       */
      if (process.env.PANEL_API_KEY) {
        try {
          let panelUser =
            await findPanelUser(panelUsername);

          if (!panelUser) {
            panelUser = await createPanelUser(
              panelUsername,
              panelEmail,
              panelPassword
            );
          } else {
            await updatePanelUserPassword(
              panelUser.id,
              panelUsername,
              panelEmail,
              panelPassword
            );
          }

          const planDoc =
            plan as unknown as {
              isAdminUpgrade?: boolean;
            };

          if (planDoc.isAdminUpgrade) {
            await promoteToAdmin(
              panelUser.id,
              panelUsername,
              panelEmail
            );
          } else {
            const allocationId =
              await getFreeAllocation();

            await createPanelServer({
              name: `${panelUsername.toUpperCase()}'S SERVER`,
              panelUserId: panelUser.id,
              memoryMb: parseMb(plan.ram),
              diskMb: parseMb(plan.disk),
              cpu: parseCpu(plan.cpu),
              allocationId,
            });
          }
        } catch (ptErr) {
          const msg =
            ptErr instanceof Error
              ? ptErr.message
              : "Panel provisioning failed";

          res.status(500).json({
            error: msg,
          });

          return;
        }
      }

      /*
       * No Coins are charged.
       * Persist zero cost for compatibility with
       * the existing Panel model.
       */
      const panelExpiresAt = new Date(
        Date.now() +
          30 * 24 * 60 * 60 * 1000
      );

      const panel = await Panel.create({
        userId: user._id,
        planName: plan.name,
        panelEmail,
        panelUsername,
        panelPassword,
        panelLoginUrl,
        txCost: 0,
        expiresAt: panelExpiresAt,
      });

      /*
       * Keep the transaction record for database
       * compatibility/audit purposes, but the amount
       * is always zero.
       */
      await Transaction.create({
        userId: user._id,
        type: "panel",
        txAmount: 0,
        ksAmount: 0,
        status: "success",
      });

      notifyOwner(
        `Panel Created For Free\n\n` +
          `User: ${user.email}\n` +
          `Plan: ${plan.name}\n` +
          `Panel Email: ${panelEmail}\n` +
          `Username: ${panelUsername}\n` +
          `Cost: 0 Coins`
      ).catch(() => {});

      res.json({
        success: true,
        free: true,
        cost: 0,
        panel,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Server error";

      res.status(500).json({
        error: msg,
      });
    }
  }
);

/**
 * Renew a panel for FREE.
 *
 * No balance check and no deduction.
 */
router.post(
  "/:id/renew",
  authGuard,
  banCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const panel = await Panel.findOne({
        _id: req.params.id,
        userId: req.user!._id,
      });

      if (!panel) {
        res.status(404).json({
          error: "Panel not found",
        });
        return;
      }

      const user = await User.findById(
        req.user!._id
      );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      const base =
        panel.status === "active" &&
        panel.expiresAt &&
        panel.expiresAt.getTime() > Date.now()
          ? panel.expiresAt.getTime()
          : Date.now();

      panel.expiresAt = new Date(
        base + 30 * 24 * 60 * 60 * 1000
      );

      panel.status = "active";
      panel.gracePeriodEnd = null;
      panel.txCost = 0;

      await panel.save();

      await Transaction.create({
        userId: user._id,
        type: "renew",
        txAmount: 0,
        ksAmount: 0,
        status: "success",
      });

      createNotification(
        user._id,
        "renewed",
        "Panel renewed for free",
        `Your panel "${panel.planName}" has been renewed for another 30 days for free.`
      ).catch(() => {});

      notifyOwner(
        `🔄 Panel Renewed For Free\n\n` +
          `User: ${user.email}\n` +
          `Plan: ${panel.planName}\n` +
          `Cost: 0 Coins`
      ).catch(() => {});

      res.json({
        success: true,
        free: true,
        cost: 0,
        panel,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Server error";

      res.status(500).json({
        error: msg,
      });
    }
  }
);

/**
 * Admin panel.
 *
 * This endpoint remains restricted to the administrator,
 * but the panel itself is completely free.
 */
router.post(
  "/purchase-admin",
  authGuard,
  banCheck,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(
        req.user!._id
      );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      if (
        (user.email || "").toLowerCase() !==
        ADMIN_EMAIL
      ) {
        res.status(403).json({
          error:
            "Admin panel purchase is restricted to the admin account only",
        });
        return;
      }

      const schema = z.object({
        panelEmail: z.string().email().optional(),
        panelUsername: z
          .string()
          .min(3)
          .max(32)
          .regex(/^[a-z0-9_]+$/)
          .optional(),
        panelPassword: z.string().min(6).optional(),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid input",
        });
        return;
      }

      const panelDomain = resolvePanelDomain();

      if (!panelDomain) {
        res.status(500).json({
          error: "PANEL_DOMAIN is not configured",
        });
        return;
      }

      const panelLoginUrl =
        `${panelDomain}/auth/login`;

      const suffix = Math.floor(
        1000 + Math.random() * 9000
      );

      const base = (
        user.username ||
        user.email.split("@")[0]
      )
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase()
        .slice(0, 12);

      const panelEmail =
        parsed.data.panelEmail || user.email;

      const panelUsername =
        parsed.data.panelUsername ||
        `${base}${suffix}`;

      const panelPassword =
        parsed.data.panelPassword ||
        `${base}@${Math.floor(
          1000 + Math.random() * 9000
        )}`;

      if (process.env.PANEL_API_KEY) {
        try {
          let panelUser =
            await findPanelUser(panelUsername);

          if (!panelUser) {
            panelUser = await createPanelUser(
              panelUsername,
              panelEmail,
              panelPassword
            );
          } else {
            await updatePanelUserPassword(
              panelUser.id,
              panelUsername,
              panelEmail,
              panelPassword
            );
          }

          await promoteToAdmin(
            panelUser.id,
            panelUsername,
            panelEmail
          );
        } catch (ptErr) {
          const msg =
            ptErr instanceof Error
              ? ptErr.message
              : "Panel provisioning failed";

          res.status(500).json({
            error: msg,
          });

          return;
        }
      }

      const adminPanelExpiresAt = new Date(
        Date.now() +
          30 * 24 * 60 * 60 * 1000
      );

      const panel = await Panel.create({
        userId: user._id,
        planName: "Admin Panel Access",
        panelEmail,
        panelUsername,
        panelPassword,
        panelLoginUrl,
        txCost: 0,
        expiresAt: adminPanelExpiresAt,
      });

      await Transaction.create({
        userId: user._id,
        type: "panel",
        txAmount: 0,
        ksAmount: 0,
        status: "success",
      });

      notifyOwner(
        `Admin Panel Created For Free\n\n` +
          `User: ${user.email}\n` +
          `Panel Email: ${panelEmail}\n` +
          `Username: ${panelUsername}\n` +
          `Cost: 0 Coins`
      ).catch(() => {});

      res.json({
        success: true,
        free: true,
        cost: 0,
        panel,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Server error";

      res.status(500).json({
        error: msg,
      });
    }
  }
);

router.delete(
  "/my/:id",
  authGuard,
  banCheck,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const panel = await Panel.findOne({
        _id: req.params.id,
        userId: req.user!._id,
      });

      if (!panel) {
        res.status(404).json({
          error: "Panel not found",
        });
        return;
      }

      await Panel.findByIdAndDelete(req.params.id);

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/admin/all",
  adminAuth,
  async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const panels = await Panel.find({})
        .sort({ purchasedAt: -1 })
        .lean();

      const userIds = [
        ...new Set(
          panels
            .map((p) => p.userId?.toString())
            .filter(Boolean)
        ),
      ];

      const users = await User.find({
        _id: { $in: userIds },
      })
        .select("email username")
        .lean();

      const userMap: Record<
        string,
        {
          email: string;
          username: string;
        }
      > = {};

      for (const u of users) {
        userMap[u._id.toString()] = {
          email: u.email,
          username: u.username || "",
        };
      }

      res.json(
        panels.map((p) => ({
          ...p,
          txCost: 0,
          free: true,
          ownerEmail:
            userMap[p.userId?.toString()]?.email ||
            "unknown",
          ownerUsername:
            userMap[p.userId?.toString()]?.username ||
            "",
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/admin/panel/:id",
  adminAuth,
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const panel = await Panel.findById(
        req.params.id
      );

      if (!panel) {
        res.status(404).json({
          error: "Panel not found",
        });
        return;
      }

      await Panel.findByIdAndDelete(req.params.id);

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Create/update-compatible plan endpoint.
 *
 * Plans are now free, therefore txCost cannot be
 * used to create a paid plan.
 */
router.post(
  "/admin/plans",
  adminAuth,
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const schema = z.object({
        name: z.string().min(2),
        description: z.string().default(""),

        /*
         * Accepted for backward compatibility with
         * existing admin clients, but always normalized
         * to zero.
         */
        txCost: z.number().min(0).optional(),
        originalTxCost: z.number().min(0).optional(),

        ram: z.string().default(""),
        disk: z.string().default(""),
        cpu: z.string().default(""),
        isBestDeal: z.boolean().default(false),
        isAdminUpgrade: z.boolean().default(false),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid input",
        });
        return;
      }

      const count =
        await PanelPlan.countDocuments();

      const plan = await PanelPlan.create({
        name: parsed.data.name,
        description: parsed.data.description,
        txCost: 0,
        originalTxCost: 0,
        ram: parsed.data.ram,
        disk: parsed.data.disk,
        cpu: parsed.data.cpu,
        isBestDeal: parsed.data.isBestDeal,
        isAdminUpgrade: parsed.data.isAdminUpgrade,
        active: true,
        order: count,
      });

      res.json({
        ok: true,
        free: true,
        plan: {
          ...plan.toObject(),
          txCost: 0,
          originalTxCost: 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/admin/plans/:id",
  adminAuth,
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await PanelPlan.findByIdAndDelete(
        req.params.id
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
