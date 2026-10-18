import { Router } from "express";
import { BroadcastNotification } from "../../models/BroadcastNotification.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/broadcast-notifications", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await BroadcastNotification.find({}).sort({ createdAt: -1 }).lean();
    res.json(notifications);
  } catch (err) { next(err); }
});

router.post("/broadcast-notifications", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, type } = req.body || {};
    if (!title || !message) { res.status(400).json({ error: "Title and message are required" }); return; }
    const notification = await BroadcastNotification.create({
      title,
      message,
      type: type || "general"
    });
    res.json({ ok: true, notification });
  } catch (err) { next(err); }
});

router.delete("/broadcast-notifications/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await BroadcastNotification.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
