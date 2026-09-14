import { Router } from "express";
import { z } from "zod";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { BugReport } from "../models/BugReport.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";

const router = Router();

const submitSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(4000),
  pageUrl: z.string().max(500).optional(),
});

router.post("/", authGuard, async (req: AuthRequest, res) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const user = req.user!;
    const recent = await BugReport.countDocuments({
      userId: user._id,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (recent >= 5) {
      res.status(429).json({ success: false, error: "Max 5 bug reports per day. Thanks for helping!" });
      return;
    }
    const doc = await BugReport.create({
      userId: user._id,
      email: user.email,
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      pageUrl: (parsed.data.pageUrl || "").trim(),
      status: "pending",
    });
    try {
      const { notifyOwner } = await import("../services/notify.js");
      notifyOwner(
        `🐛 New bug report\nFrom: ${user.email}\nTitle: ${doc.title}\nID: ${doc._id}`
      ).catch(() => {});
    } catch {}
    res.json({
      success: true,
      data: {
        id: String(doc._id),
        status: doc.status,
        message: "Thanks! Valid reports may earn Coins after review.",
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to submit report" });
  }
});

router.get("/mine", authGuard, async (req: AuthRequest, res) => {
  try {
    const rows = await BugReport.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: String(r._id),
        title: r.title,
        description: (r as { description?: string }).description || "",
        status: r.status,
        rewardTx: r.rewardTx || 0,
        pageUrl: (r as { pageUrl?: string }).pageUrl || "",
        createdAt: r.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to load reports" });
  }
});

function isAdminEmail(email: string): boolean {
  const admin = (process.env.ADMIN_EMAIL || "").toLowerCase();
  return !!admin && email.toLowerCase() === admin;
}

router.get("/admin/all", authGuard, async (req: AuthRequest, res) => {
  try {
    if (!isAdminEmail(req.user!.email) && !(req.user as { isModerator?: boolean }).isModerator) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    const rows = await BugReport.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed" });
  }
});

const rewardSchema = z.object({
  rewardTx: z.number().min(1).max(50),
  adminNote: z.string().max(500).optional(),
});

router.post("/admin/:id/reward", authGuard, async (req: AuthRequest, res) => {
  try {
    if (!isAdminEmail(req.user!.email)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    const parsed = rewardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid input" });
      return;
    }
    const report = await BugReport.findById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    if (report.status === "rewarded") {
      res.status(400).json({ success: false, error: "Already rewarded" });
      return;
    }
    const amount = parsed.data.rewardTx;
    await User.findByIdAndUpdate(report.userId, { $inc: { txCoins: amount } });
    await Transaction.create({
      userId: report.userId,
      type: "admin_grant",
      txAmount: amount,
      ksAmount: 0,
      status: "success",
      paystackRef: "bug-reward-" + String(report._id),
    }).catch(() => {});
    report.status = "rewarded";
    report.rewardTx = amount;
    report.adminNote = parsed.data.adminNote || "";
    report.rewardedAt = new Date();
    await report.save();
    try {
      const { createNotification } = await import("../services/notifications.js");
      createNotification(
        report.userId,
        "reward",
        "Bug report reward",
        `You earned ${amount} Coins for your bug report: "${report.title}". Thanks!`
      ).catch(() => {});
    } catch {}
    res.json({ success: true, data: { id: String(report._id), rewardTx: amount } });
  } catch {
    res.status(500).json({ success: false, error: "Reward failed" });
  }
});

export default router;
