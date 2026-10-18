import { Router } from "express";
import mongoose from "mongoose";
import { getWaStatus } from "../services/whatsappOwner.js";

const router = Router();

/**
 * Public status / ping — no login required.
 * GET /api/status  or  GET /api/ping
 */
router.get(["/", "/ping"], (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;

  let wa = "offline";
  try {
    const s = getWaStatus();
    if (s.connected) wa = "running";
    else if (s.pairing) wa = "pairing";
  } catch {
    wa = "offline";
  }

  res.json({
    SiteStatus: "online",
    WABot: wa,
    DBstatus: dbReady ? "connected" : "disconnected",
  });
});

export default router;
