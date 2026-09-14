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
    res.status(503).json({ error: "Panels are currently disabled", serviceDisabled: "panels" });
    return;
  }
  next();
});

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

interface AdminReq extends Request { user?: IUser; }

async function adminAuth(req: AdminReq, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) { res.status(403).json({ error: "Forbidden" }); return; }
    req.user = user as unknown as IUser;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
}

function isUnlimited(str: string): boolean {
  if (!str) return false;
  const lower = str.toLowerCase().trim();
  return lower.includes("unlimited") || lower === "0" || lower.includes("∞") || lower === "0mb" || lower === "0gb" || lower === "0%";
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
  return m[2] === "gb" ? Math.round(value * 1024) : Math.round(value);
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

router.get("/plans", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await PanelPlan.find({ active: true }).sort({ order: 1 }).lean();
    res.json(plans);
  } catch (err) { next(err); }
});

router.get("/my", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const panels = await Panel.find({ userId: req.user!._id }).sort({ purchasedAt: -1 }).lean();
    res.json(panels);
  } catch (err) { next(err); }
});

router.post("/purchase", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      planId: z.string(),
      panelEmail: z.string().email().optional(),
      panelUsername: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/, "Username must be lowercase letters, numbers, or underscores").optional(),
      panelPassword: z.string().min(6).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }

    const plan = await PanelPlan.findById(parsed.data.planId);
    if (!plan || !plan.active) { res.status(404).json({ error: "Plan not found" }); return; }

    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.txCoins < plan.txCost) {
      res.status(403).json({ error: "Insufficient Coins", code: "INSUFFICIENT_COINS" });
      return;
    }

    const panelDomain = resolvePanelDomain();
    if (!panelDomain) {
      res.status(500).json({ error: "PANEL_DOMAIN is not configured" });
      return;
    }
    const panelLoginUrl = `${panelDomain}/auth/login`;

    const suffix = Math.floor(1000 + Math.random() * 9000);
    const base = (user.username || user.email.split("@")[0]).replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12);
    const defaultUsername = `${base}${suffix}`;

    const panelEmail = parsed.data.panelEmail || user.email;
    const panelUsername = parsed.data.panelUsername || defaultUsername;
    const panelPassword = parsed.data.panelPassword || `${base}@${Math.floor(1000 + Math.random() * 9000)}`;

    if (process.env.PANEL_API_KEY) {
      try {
        let panelUser = await findPanelUser(panelUsername);
        if (!panelUser) {
          panelUser = await createPanelUser(panelUsername, panelEmail, panelPassword);
        } else {
          await updatePanelUserPassword(panelUser.id, panelUsername, panelEmail, panelPassword);
        }
        const planDoc = plan as unknown as { isAdminUpgrade?: boolean };
        if (planDoc.isAdminUpgrade) {
          await promoteToAdmin(panelUser.id, panelUsername, panelEmail);
        } else {
          const allocationId = await getFreeAllocation();
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
        const msg = ptErr instanceof Error ? ptErr.message : "Panel provisioning failed";
        res.status(500).json({ error: msg });
        return;
      }
    }

    user.txCoins -= plan.txCost;
    await user.save();

    const panelExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const panel = await Panel.create({
      userId: user._id,
      planName: plan.name,
      panelEmail,
      panelUsername,
      panelPassword,
      panelLoginUrl,
      txCost: plan.txCost,
      expiresAt: panelExpiresAt,
    });

    await Transaction.create({
      userId: user._id,
      type: "panel",
      txAmount: plan.txCost,
      ksAmount: 0,
      status: "success",
    });

    notifyOwner(
      `Panel Purchased\n\nUser: ${user.email}\nPlan: ${plan.name}\nPanel Email: ${panelEmail}\nUsername: ${panelUsername}\nCost: ${plan.txCost} Coins`
    ).catch(() => {});

    res.json({ success: true, panel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    res.status(500).json({ error: msg });
  }
});

router.post("/:id/renew", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const panel = await Panel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!panel) { res.status(404).json({ error: "Panel not found" }); return; }

    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.txCoins < panel.txCost) {
      res.status(403).json({ error: "Insufficient Coins", code: "INSUFFICIENT_COINS", requiredTx: panel.txCost });
      return;
    }

    user.txCoins -= panel.txCost;
    await user.save();

    const base = panel.status === "active" && panel.expiresAt && panel.expiresAt.getTime() > Date.now()
      ? panel.expiresAt.getTime()
      : Date.now();
    panel.expiresAt = new Date(base + 30 * 24 * 60 * 60 * 1000);
    panel.status = "active";
    panel.gracePeriodEnd = null;
    await panel.save();

    await Transaction.create({
      userId: user._id,
      type: "renew",
      txAmount: panel.txCost,
      ksAmount: 0,
      status: "success",
    });

    createNotification(user._id, "renewed", "Panel renewed", `Your panel "${panel.planName}" has been renewed for another 30 days.`).catch(() => {});
    notifyOwner(`🔄 *Panel Renewed*\n\nUser: \`${user.email}\`\nPlan: \`${panel.planName}\`\nCost: ${panel.txCost} Coins`).catch(() => {});

    res.json({ success: true, panel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    res.status(500).json({ error: msg });
  }
});

router.post("/purchase-admin", authGuard, banCheck, async (req: AuthRequest, res) => {
  const ADMIN_PANEL_COST = 40;
  try {
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if ((user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Admin panel purchase is restricted to the admin account only" });
      return;
    }

    if (user.txCoins < ADMIN_PANEL_COST) {
      res.status(403).json({ error: "Insufficient Coins", code: "INSUFFICIENT_COINS" });
      return;
    }

    const schema = z.object({
      panelEmail: z.string().email().optional(),
      panelUsername: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/).optional(),
      panelPassword: z.string().min(6).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const panelDomain = resolvePanelDomain();
    if (!panelDomain) {
      res.status(500).json({ error: "PANEL_DOMAIN is not configured" });
      return;
    }
    const panelLoginUrl = `${panelDomain}/auth/login`;

    const suffix = Math.floor(1000 + Math.random() * 9000);
    const base = (user.username || user.email.split("@")[0]).replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12);

    const panelEmail = parsed.data?.panelEmail || user.email;
    const panelUsername = parsed.data?.panelUsername || `${base}${suffix}`;
    const panelPassword = parsed.data?.panelPassword || `${base}@${Math.floor(1000 + Math.random() * 9000)}`;

    if (process.env.PANEL_API_KEY) {
      try {
        let panelUser = await findPanelUser(panelUsername);
        if (!panelUser) {
          panelUser = await createPanelUser(panelUsername, panelEmail, panelPassword);
        } else {
          await updatePanelUserPassword(panelUser.id, panelUsername, panelEmail, panelPassword);
        }
        await promoteToAdmin(panelUser.id, panelUsername, panelEmail);
      } catch (ptErr) {
        const msg = ptErr instanceof Error ? ptErr.message : "Panel provisioning failed";
        res.status(500).json({ error: msg });
        return;
      }
    }

    user.txCoins -= ADMIN_PANEL_COST;
    await user.save();

    const adminPanelExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const panel = await Panel.create({
      userId: user._id,
      planName: "Admin Panel Access",
      panelEmail,
      panelUsername,
      panelPassword,
      panelLoginUrl,
      txCost: ADMIN_PANEL_COST,
      expiresAt: adminPanelExpiresAt,
    });

    await Transaction.create({ userId: user._id, type: "panel", txAmount: ADMIN_PANEL_COST, ksAmount: 0, status: "success" });
    notifyOwner(`Admin Panel Purchased\n\nUser: ${user.email}\nPanel Email: ${panelEmail}\nUsername: ${panelUsername}\nCost: ${ADMIN_PANEL_COST} Coins`).catch(() => {});
    res.json({ success: true, panel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    res.status(500).json({ error: msg });
  }
});

router.delete("/my/:id", authGuard, banCheck, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const panel = await Panel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!panel) { res.status(404).json({ error: "Panel not found" }); return; }
    await Panel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get("/admin/all", adminAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const panels = await Panel.find({}).sort({ purchasedAt: -1 }).lean();
    const userIds = [...new Set(panels.map(p => p.userId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select("email username").lean();
    const userMap: Record<string, { email: string; username: string }> = {};
    for (const u of users) userMap[u._id.toString()] = { email: u.email, username: u.username || "" };
    res.json(panels.map(p => ({
      ...p,
      ownerEmail: userMap[p.userId?.toString()]?.email || "unknown",
      ownerUsername: userMap[p.userId?.toString()]?.username || ""
    })));
  } catch (err) { next(err); }
});

router.delete("/admin/panel/:id", adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const panel = await Panel.findById(req.params.id);
    if (!panel) { res.status(404).json({ error: "Panel not found" }); return; }
    await Panel.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post("/admin/plans", adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().default(""),
      txCost: z.number().min(1),
      originalTxCost: z.number().default(0),
      ram: z.string().default(""),
      disk: z.string().default(""),
      cpu: z.string().default(""),
      isBestDeal: z.boolean().default(false),
      isAdminUpgrade: z.boolean().default(false),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const count = await PanelPlan.countDocuments();
    const plan = await PanelPlan.create({ ...parsed.data, active: true, order: count });
    res.json({ ok: true, plan });
  } catch (err) { next(err); }
});

router.delete("/admin/plans/:id", adminAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PanelPlan.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
