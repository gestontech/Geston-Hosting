import { Router } from "express";
import { Notification } from "../models/Notification.js";
import { BroadcastNotification } from "../models/BroadcastNotification.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";

const router = Router();

router.use(authGuard);
router.use(banCheck);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const [notifications, broadcasts, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(100).lean(),
      BroadcastNotification.find({}).sort({ createdAt: -1 }).limit(20).lean(),
      Notification.countDocuments({ userId: req.user!._id, read: false })
    ]);
    const combined = [
      ...notifications,
      ...broadcasts.map(b => ({ ...b, userId: req.user!._id, read: false, isBroadcast: true }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 100);
    res.json({ notifications: combined, unreadCount: unreadCount + broadcasts.length });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/unread-count", async (req: AuthRequest, res) => {
  try {
    const [unreadCount, broadcastCount] = await Promise.all([
      Notification.countDocuments({ userId: req.user!._id, read: false }),
      BroadcastNotification.countDocuments({})
    ]);
    res.json({ unreadCount: unreadCount + broadcastCount });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/mark-read", async (req: AuthRequest, res) => {
  try {
    await Notification.updateMany({ userId: req.user!._id, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/all", async (req: AuthRequest, res) => {
  try {
    await Notification.deleteMany({ userId: req.user!._id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, userId: req.user!._id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
