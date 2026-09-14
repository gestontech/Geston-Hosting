import { Router } from "express";
import {
  previewOutageRefunds,
  executeOutageRefunds,
} from "../../services/outageRefund.js";
import { logger } from "../../logger.js";

const router = Router();

/**
 * GET /api/admin/outage-refund/preview
 * Dry-run: lists who would get Coins back (paid bots/panels with remaining days).
 */
router.get("/outage-refund/preview", async (req, res) => {
  try {
    const includePanels = String(req.query.panels || "1") !== "0";
    const result = await previewOutageRefunds(includePanels);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "outage refund preview failed");
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Preview failed",
    });
  }
});

/**
 * POST /api/admin/outage-refund/execute
 * Body: { confirm: "REFUND", panels?: boolean }
 * Credits Coins, marks bots refunded, emails users. Idempotent per bot/panel.
 */
router.post("/outage-refund/execute", async (req, res) => {
  try {
    const body = (req.body || {}) as { confirm?: string; panels?: boolean };
    if (body.confirm !== "REFUND") {
      res.status(400).json({
        ok: false,
        error: 'Send { "confirm": "REFUND" } to run. Use GET /preview first.',
      });
      return;
    }
    const includePanels = body.panels !== false;
    const result = await executeOutageRefunds(includePanels);
    logger.info(
      {
        totalTx: result.totalTx,
        users: result.usersAffected,
        refunded: result.refunded,
        emailed: result.emailed,
      },
      "outage refund executed"
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "outage refund execute failed");
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Execute failed",
    });
  }
});

export default router;
