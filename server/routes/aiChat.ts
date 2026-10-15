import { Router } from "express";
import rateLimit from "express-rate-limit";
import { runAIChat } from "../services/aiChat.js";
import { logger } from "../logger.js";

const router = Router();

const chatLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat requests. Try again in a minute." },
});

router.post("/", chatLimit, async (req, res, next) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message || message.length > 2000) {
      res.status(400).json({ error: "message required (max 2000 chars)" });
      return;
    }
    const result = await runAIChat({
      surface: "site",
      message,
      isOwner: false,
      userLabel: "site-chat",
    });
    res.json({
      reply: result.text,
      requestLiveAgent: result.requestLiveAgent,
    });
  } catch (err) {
    logger.warn({ err }, "site AI chat failed");
    next(err);
  }
});

export default router;
