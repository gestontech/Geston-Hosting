import { Router, type Response, type NextFunction } from "express";
import { z } from "zod";
import { Bot } from "../../models/Bot.js";
import { Transaction } from "../../models/Transaction.js";
import { type AuthRequest } from "../../middleware/auth.js";
import {
  enableMaintenanceMode,
  disableMaintenanceMode,
  restartApp,
  setConfigVar,
} from "../../services/heroku.js";
import { createNotification } from "../../services/notifications.js";

const router = Router();

router.post("/:id/stop", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user!._id });

    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const success = await enableMaintenanceMode(bot.herokuAppName);

    if (success) {
      bot.status = "stopped";
      await bot.save();
    }

    res.json({
      success,
      status: bot.status,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/start", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user!._id });

    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const success = await disableMaintenanceMode(bot.herokuAppName);

    if (success) {
      bot.status = "running";
      await bot.save();
    }

    res.json({
      success,
      status: bot.status,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/restart", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user!._id });

    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    const success = await restartApp(bot.herokuAppName);

    if (success) {
      bot.status = "running";
      await bot.save();
    }

    res.json({
      success,
      status: bot.status,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/renew", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      months: z.number().min(1).max(12),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const { months } = parsed.data;

    const bot = await Bot.findOne({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    if (bot.status === "deleted") {
      res.status(400).json({
        error: "Bot has been permanently deleted",
      });
      return;
    }

    /*
     * Geston Hosting is completely free.
     *
     * Renewal no longer:
     * - checks the user's Coins balance
     * - calculates a payment cost
     * - deducts Coins
     *
     * The renewal itself remains fully functional.
     */
    const now = new Date();

    const base =
      bot.status === "expired"
        ? now
        : bot.expiresAt > now
          ? bot.expiresAt
          : now;

    bot.expiresAt = new Date(
      base.getTime() +
        months * 30 * 24 * 60 * 60 * 1000
    );

    bot.gracePeriodEnd = null;

    if (bot.status === "expired") {
      try {
        await disableMaintenanceMode(bot.herokuAppName);
      } catch {
        // The bot can still be renewed even if the host
        // maintenance state cannot be changed immediately.
      }

      bot.status = "running";
    }

    await bot.save();

    /*
     * Keep a transaction/audit record for compatibility with
     * the existing database and dashboard.
     *
     * No money or Coins are involved.
     */
    await Transaction.create({
      userId: req.user!._id,
      type: "renew",
      txAmount: 0,
      ksAmount: 0,
      status: "success",
    });

    createNotification(
      req.user!._id,
      "renewed",
      "Bot renewed for free",
      `"${bot.herokuAppName}" was renewed for ${months} month${
        months > 1 ? "s" : ""
      } for free.`
    ).catch(() => {});

    res.json({
      success: true,
      free: true,
      cost: 0,
      bot,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/vars", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      session: z.string().min(1),
      device: z.enum(["android", "ios"]).optional(),
      extraVars: z.record(z.string(), z.string()).optional(),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const { session, device, extraVars } = parsed.data;

    const bot = await Bot.findOne({
      _id: req.params.id,
      userId: req.user!._id,
    });

    if (!bot) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    if (["deleted", "building"].includes(bot.status)) {
      res.status(400).json({
        error: "Cannot update vars while bot is building or deleted",
      });
      return;
    }

    const sessionOk = await setConfigVar(
      bot.herokuAppName,
      "SESSION",
      session
    );

    if (!sessionOk) {
      res.status(502).json({
        error:
          "Could not update session on the host. Try again in a moment.",
      });
      return;
    }

    bot.sessionVar = session;

    if (device) {
      const deviceOk = await setConfigVar(
        bot.herokuAppName,
        "DEVICE",
        device
      );

      if (!deviceOk) {
        res.status(502).json({
          error:
            "Session saved but device type failed to update. Retry device change.",
        });

        await bot.save();
        return;
      }
    }

    if (extraVars) {
      const results = await Promise.all(
        Object.entries(extraVars).map(async ([k, v]) => ({
          k,
          ok: await setConfigVar(bot.herokuAppName, k, v),
        }))
      );

      const failed = results
        .filter((r) => !r.ok)
        .map((r) => r.k);

      if (failed.length) {
        await bot.save();

        res.status(502).json({
          error: `Session saved but some config vars failed: ${failed.join(
            ", "
          )}`,
        });

        return;
      }
    }

    await bot.save();

    res.json({
      success: true,
      sessionVar: bot.sessionVar,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
