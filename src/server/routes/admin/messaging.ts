import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import {
  getWaStatusDetailed,
  connectWithPairingCode,
  reconnectFromDb,
  disconnectWa,
  logoutWa,
  cleanPhone,
} from "../../services/whatsappOwner.js";

const router = Router();

function ownerId(): string {
  return String(process.env.BOT_OWNER_ID || "").trim();
}

router.get("/messaging/status", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const wa = await getWaStatusDetailed();
    res.json({
      whatsapp: {
        connected: wa.connected,
        pairing: wa.pairing,
        pairingCode: wa.pairingCode || null,
        pairingPhone: wa.pairingPhone || null,
        phoneNumber: wa.phoneNumber || "",
        dbStatus: wa.dbStatus,
        lastConnectedAt: wa.lastConnectedAt,
        ownerId: wa.ownerId,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/messaging/wa/connect", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const oid = ownerId();
    if (!oid) {
      res.status(400).json({ error: "BOT_OWNER_ID is not configured" });
      return;
    }

    const st = await getWaStatusDetailed();
    if (st.connected) {
      res.status(409).json({ error: "WhatsApp is already connected. Disconnect first." });
      return;
    }

    const rawPhone = String(req.body?.phone || "");
    const phone = cleanPhone(rawPhone);
    if (!phone || phone.length < 8) {
      res.status(400).json({
        error: "Invalid phone number. Use digits with country code, e.g. 254712345678",
      });
      return;
    }

    // If we already have a live pairing code for this phone, return it immediately
    if (st.pairing && st.pairingCode && (!st.pairingPhone || st.pairingPhone === phone)) {
      res.json({
        ok: true,
        pairingCode: st.pairingCode,
        phone: st.pairingPhone || phone,
        message: "Pairing already in progress — use this code",
      });
      return;
    }

    let pairingCode = "";
    let codeSent = false;

    const resultPromise = connectWithPairingCode(oid, phone, async (code) => {
      pairingCode = String(code || "").replace(/\s+/g, "");
      codeSent = true;
    });

    // Wait up to 50s for the pairing code
    const codeWait = new Promise<void>((resolve) => {
      const started = Date.now();
      const tick = () => {
        if (codeSent || Date.now() - started > 50000) resolve();
        else setTimeout(tick, 150);
      };
      tick();
    });

    await codeWait;

    // Re-read from status in case code was stored in memory
    const after = await getWaStatusDetailed();
    if (!pairingCode && after.pairingCode) pairingCode = after.pairingCode;

    if (!pairingCode) {
      resultPromise.catch(() => {});
      res.status(500).json({
        error: "Failed to generate pairing code. Wait a few seconds and try again.",
      });
      return;
    }

    resultPromise.catch(() => {});

    res.json({
      ok: true,
      pairingCode,
      phone,
      message: "Enter this code in WhatsApp → Linked Devices → Link with phone number",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/messaging/wa/restart", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const oid = ownerId();
    if (!oid) {
      res.status(400).json({ error: "BOT_OWNER_ID is not configured" });
      return;
    }
    const result = await reconnectFromDb(oid);
    if (!result.ok) {
      res.status(400).json({ error: result.error || "Restart failed" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/messaging/wa/disconnect", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const oid = ownerId();
    if (!oid) {
      res.status(400).json({ error: "BOT_OWNER_ID is not configured" });
      return;
    }
    const result = await disconnectWa(oid);
    if (!result.ok) {
      res.status(400).json({ error: result.error || "Disconnect failed" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/messaging/wa/logout", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const oid = ownerId();
    if (!oid) {
      res.status(400).json({ error: "BOT_OWNER_ID is not configured" });
      return;
    }
    const result = await logoutWa(oid);
    if (!result.ok) {
      res.status(400).json({ error: result.error || "Logout failed" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
