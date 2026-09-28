import { Router } from "express";
import { z } from "zod";
import { apiKeyGuard } from "../middleware/apiKeyAuth.js";
import type { AuthRequest } from "../middleware/auth.js";
import { Bot } from "../models/Bot.js";
import { BotTemplate, type IBotTemplate } from "../models/BotTemplate.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Team } from "../models/Team.js";
import { TrialCheck } from "../models/TrialCheck.js";
import { BlockedTrial } from "../models/BlockedTrial.js";
import {
  deployBotApp,
  deleteApp,
  findBestTeam,
  setConfigVar,
  enableMaintenanceMode,
  disableMaintenanceMode,
  restartApp,
  getSetupStatus,
  appExists,
} from "../services/heroku.js";
import { isServiceDisabled } from "../lib/featureFlags.js";
import { createNotification } from "../services/notifications.js";
import { notifyOwner } from "../services/notify.js";

const router = Router();

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

router.get("/me", apiKeyGuard, async (req: AuthRequest, res) => {
  const user = req.user!;

  res.json({
    success: true,
    data: {
      email: user.email,
      username: user.username || null,
      txCoins: 0,
      currency: user.currency || "USD",
      apiCallCount: user.apiCallCount || 0,
      free: true,
    },
  });
});

/**
 * List bot templates.
 *
 * All templates are free.
 */
router.get(
  "/templates",
  apiKeyGuard,
  async (_req: AuthRequest, res) => {
    try {
      const templates = await BotTemplate.find({
        active: true,
      })
        .sort({
          isDefault: -1,
          order: 1,
          createdAt: 1,
        })
        .select(
          "name shareableSlug costTx isDefault imageUrl sessionIdUrl"
        )
        .lean();

      res.json({
        success: true,
        data: templates.map((t) => ({
          id: String(t._id),
          name: t.name,
          slug: t.shareableSlug || null,

          // Payment system removed.
          costTx: 0,
          free: true,

          isDefault: !!t.isDefault,
          imageUrl: t.imageUrl || null,
          sessionIdUrl: t.sessionIdUrl || null,
        })),
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Failed to list templates",
      });
    }
  }
);

/**
 * List this account's bots.
 */
router.get(
  "/bots",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      const bots = await Bot.find({
        userId: req.user!._id,
        status: { $ne: "deleted" },
      })
        .sort({ deployedAt: -1 })
        .lean();

      res.json({
        success: true,
        data: bots.map((b) => ({
          id: String(b._id),
          name: b.herokuAppName,
          status: b.status,
          isTrial: !!b.isTrial,
          templateName: b.templateName || null,
          expiresAt: b.expiresAt,
          deployedAt: b.deployedAt,

          // Every bot is free.
          costTx: 0,
          free: true,
        })),
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Failed to list bots",
      });
    }
  }
);

router.get(
  "/bots/:id",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      const id = paramId(req.params.id);

      const bot = await Bot.findOne({
        _id: id,
        userId: req.user!._id,
        status: { $ne: "deleted" },
      }).lean();

      if (!bot) {
        res.status(404).json({
          success: false,
          error: "Bot not found",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: String(bot._id),
          name: bot.herokuAppName,
          status: bot.status,
          isTrial: !!bot.isTrial,
          templateName: bot.templateName || null,
          expiresAt: bot.expiresAt,
          deployedAt: bot.deployedAt,

          costTx: 0,
          free: true,
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Failed to get bot",
      });
    }
  }
);

const deployBody = z.object({
  templateName: z.string().min(1).optional(),
  botTemplateId: z.string().min(1).optional(),
  botName: z.string().min(5).max(30),
  sessionVar: z.string().min(1),
  device: z.enum(["android", "ios"]).optional(),
  months: z.number().min(1).max(9).optional(),
  extraVars: z.record(z.string(), z.string()).optional(),
});

/**
 * Deploy a bot for FREE.
 *
 * Payment and Coins checks have been completely removed.
 */
router.post(
  "/deploy",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      if (await isServiceDisabled("botDeploy")) {
        res.status(503).json({
          success: false,
          error:
            "Bot deployment is currently disabled",
        });
        return;
      }

      const parsed = deployBody.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid input",
          details: parsed.error.issues,
        });
        return;
      }

      const {
        templateName,
        botTemplateId,
        botName,
        sessionVar,
        device = "android",
        months = 1,
        extraVars,
      } = parsed.data;

      let template: IBotTemplate | null = null;

      if (botTemplateId) {
        const found = await BotTemplate.findById(
          botTemplateId
        ).lean();

        template = found as IBotTemplate | null;
      } else if (templateName) {
        const q = String(templateName).trim();

        const found = await BotTemplate.findOne({
          active: true,
          $or: [
            {
              name: new RegExp(
                "^" +
                  q.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                  ) +
                  "$",
                "i"
              ),
            },
            {
              shareableSlug: q.toLowerCase(),
            },
          ],
        }).lean();

        template = found as IBotTemplate | null;
      } else {
        const found = await BotTemplate.findOne({
          active: true,
          isDefault: true,
        }).lean();

        template = found as IBotTemplate | null;
      }

      if (!template) {
        res.status(404).json({
          success: false,
          error:
            "Template not found. GET /api/v1/templates for available names.",
        });
        return;
      }

      const user = await User.findById(
        req.user!._id
      );

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      /*
       * IMPORTANT:
       *
       * The old code calculated:
       *   template.costTx * months
       *
       * and then checked/debited txCoins.
       *
       * That entire payment mechanism has been removed.
       */
      const cost = 0;

      const existingByName = await Bot.findOne({
        herokuAppName: botName,
      });

      if (
        existingByName &&
        !["deleted", "expired"].includes(
          existingByName.status
        )
      ) {
        res.status(409).json({
          success: false,
          error: "Bot name already in use",
        });
        return;
      }

      if (existingByName) {
        await Bot.deleteOne({
          _id: existingByName._id,
        });

        await User.updateOne(
          { _id: existingByName.userId },
          {
            $pull: {
              bots: existingByName._id,
            },
          }
        );
      }

      const teams = await Team.find({
        active: true,
      });

      const teamNames =
        teams.length > 0
          ? teams.map((t) => t.name)
          : ["gestontech254"];

      const bestTeam =
        await findBestTeam(teamNames);

      if (!bestTeam) {
        res.status(500).json({
          success: false,
          error:
            "No available teams for deployment",
        });
        return;
      }

      const deployedAt = new Date();

      const expiresAt = new Date(
        deployedAt.getTime() +
          months *
            30 *
            24 *
            60 *
            60 *
            1000
      );

      const bot = await Bot.create({
        userId: user._id,
        herokuAppName: botName,
        phoneNumber: "",
        sessionVar,
        deployedAt,
        expiresAt,
        isTrial: false,
        status: "building",
        teamName: bestTeam,
        templateId: String(template._id),
        templateName: template.name,
        sessionIdUrl:
          template.sessionIdUrl || "",

        // Always zero.
        cost: 0,
      });

      user.bots.push(bot._id);
      await user.save();

      /*
       * Keep an audit transaction for compatibility.
       * No money/Coins are involved.
       */
      await Transaction.create({
        userId: user._id,
        type: "deploy",
        txAmount: 0,
        ksAmount: 0,
        status: "success",
      });

      res.json({
        success: true,
        free: true,
        data: {
          id: String(bot._id),
          name: botName,
          status: "building",
          costTx: 0,
          expiresAt,
          templateName: template.name,
        },
      });

      const templateIsDefault =
        template.isDefault === true;

      const githubRepo = template.githubRepo;
      const templateDisplayName =
        template.name;

      /*
       * Deployment continues asynchronously.
       *
       * No refund logic is necessary because nothing
       * was charged in the first place.
       */
      (async () => {
        try {
          let deployed: {
            success: boolean;
            setupId?: string;
          };

          if (
            !templateIsDefault &&
            githubRepo
          ) {
            const rawRepo =
              githubRepo.replace(/\.git$/, "");

            const tarballUrl =
              rawRepo + "/tarball/HEAD";

            const envOverrides: Record<
              string,
              string
            > = {
              ...(extraVars || {}),
              SESSION: sessionVar,
              BOT_NAME: botName,
              HEROKU_APP_NAME: botName,
              HEROKU_API_KEY:
                process.env.HEROKU_API_KEY || "",
            };

            deployed =
              await deployBotApp(
                botName,
                bestTeam,
                sessionVar,
                "",
                false,
                tarballUrl,
                envOverrides
              );
          } else {
            deployed =
              await deployBotApp(
                botName,
                bestTeam,
                sessionVar,
                "",
                false
              );

            if (deployed.success) {
              if (device === "ios") {
                await setConfigVar(
                  botName,
                  "DEVICE",
                  "ios"
                ).catch(() => {});
              }

              if (extraVars) {
                await Promise.all(
                  Object.entries(
                    extraVars
                  ).map(([k, v]) =>
                    setConfigVar(
                      botName,
                      k,
                      v
                    ).catch(() => {})
                  )
                );
              }
            }
          }

          if (
            deployed.success &&
            deployed.setupId
          ) {
            await Bot.findByIdAndUpdate(
              bot._id,
              {
                setupId:
                  deployed.setupId,
              }
            );

            let attempts = 0;

            const poll =
              async (): Promise<void> => {
                if (attempts >= 24) {
                  const exists =
                    await appExists(
                      botName
                    ).catch(
                      () => false
                    );

                  await Bot.findByIdAndUpdate(
                    bot._id,
                    {
                      status: exists
                        ? "running"
                        : "failed",
                    }
                  );

                  return;
                }

                attempts++;

                const { status } =
                  await getSetupStatus(
                    deployed.setupId!
                  ).catch(() => ({
                    status: "unknown",
                  }));

                if (
                  status === "succeeded"
                ) {
                  await Bot.findByIdAndUpdate(
                    bot._id,
                    {
                      status: "running",
                    }
                  );

                  createNotification(
                    user._id,
                    "deploy",
                    "Bot deployed",
                    `"${botName}" is now running for free.`
                  ).catch(
                    () => {}
                  );

                  notifyOwner(
                    `🚀 *API Deploy*\n` +
                      `User: \`${user.email}\`\n` +
                      `App: \`${botName}\`\n` +
                      `Template: \`${templateDisplayName}\`\n` +
                      `Cost: 0 Coins`
                  ).catch(
                    () => {}
                  );
                } else if (
                  status === "failed"
                ) {
                  await Bot.findByIdAndUpdate(
                    bot._id,
                    {
                      status: "failed",
                    }
                  );
                } else {
                  setTimeout(() => {
                    poll().catch(
                      () => {}
                    );
                  }, 15000);
                }
              };

            setTimeout(() => {
              poll().catch(
                () => {}
              );
            }, 15000);
          } else if (
            deployed.success
          ) {
            await Bot.findByIdAndUpdate(
              bot._id,
              {
                status: "running",
              }
            );
          } else {
            await Bot.findByIdAndUpdate(
              bot._id,
              {
                status: "failed",
              }
            );
          }
        } catch {
          try {
            await Bot.findByIdAndUpdate(
              bot._id,
              {
                status: "failed",
              }
            );
          } catch {}
        }
      })();
    } catch {
      res.status(500).json({
        success: false,
        error: "Deploy failed",
      });
    }
  }
);

async function ownBot(
  req: AuthRequest,
  id: string
) {
  return Bot.findOne({
    _id: id,
    userId: req.user!._id,
  });
}

router.post(
  "/bots/:id/stop",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      const bot = await ownBot(
        req,
        paramId(req.params.id)
      );

      if (!bot) {
        res.status(404).json({
          success: false,
          error: "Bot not found",
        });
        return;
      }

      const success =
        await enableMaintenanceMode(
          bot.herokuAppName
        );

      if (success) {
        bot.status = "stopped";
        await bot.save();
      }

      res.json({
        success,
        status: bot.status,
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Stop failed",
      });
    }
  }
);

router.post(
  "/bots/:id/start",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      const bot = await ownBot(
        req,
        paramId(req.params.id)
      );

      if (!bot) {
        res.status(404).json({
          success: false,
          error: "Bot not found",
        });
        return;
      }

      const success =
        await disableMaintenanceMode(
          bot.herokuAppName
        );

      if (success) {
        bot.status = "running";
        await bot.save();
      }

      res.json({
        success,
        status: bot.status,
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Start failed",
      });
    }
  }
);

router.post(
  "/bots/:id/restart",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      const bot = await ownBot(
        req,
        paramId(req.params.id)
      );

      if (!bot) {
        res.status(404).json({
          success: false,
          error: "Bot not found",
        });
        return;
      }

      const success =
        await restartApp(
          bot.herokuAppName
        );

      if (success) {
        bot.status = "running";
        await bot.save();
      }

      res.json({
        success,
        status: bot.status,
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Restart failed",
      });
    }
  }
);

/**
 * Renew a bot for FREE through the public API.
 */
router.post(
  "/bots/:id/renew",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        months: z.number().min(1).max(12),
      });

      const parsed =
        schema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid input",
        });
        return;
      }

      const { months } = parsed.data;

      const bot = await ownBot(
        req,
        paramId(req.params.id)
      );

      if (!bot) {
        res.status(404).json({
          success: false,
          error: "Bot not found",
        });
        return;
      }

      if (bot.status === "deleted") {
        res.status(400).json({
          success: false,
          error:
            "Bot permanently deleted",
        });
        return;
      }

      const user = await User.findById(
        req.user!._id
      );

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      const now = new Date();

      const base =
        bot.status === "expired"
          ? now
          : bot.expiresAt > now
            ? bot.expiresAt
            : now;

      bot.expiresAt = new Date(
        base.getTime() +
          months *
            30 *
            24 *
            60 *
            60 *
            1000
      );

      bot.gracePeriodEnd = null;

      if (bot.status === "expired") {
        try {
          await disableMaintenanceMode(
            bot.herokuAppName
          );
        } catch {}

        bot.status = "running";
      }

      await bot.save();

      await Transaction.create({
        userId: user._id,
        type: "renew",
        txAmount: 0,
        ksAmount: 0,
        status: "success",
      });

      res.json({
        success: true,
        free: true,
        cost: 0,
        data: {
          id: String(bot._id),
          expiresAt: bot.expiresAt,
          status: bot.status,
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Renew failed",
      });
    }
  }
);

router.delete(
  "/bots/:id",
  apiKeyGuard,
  async (req: AuthRequest, res) => {
    try {
      const bot = await ownBot(
        req,
        paramId(req.params.id)
      );

      if (!bot) {
        res.status(404).json({
          success: false,
          error: "Bot not found",
        });
        return;
      }

      try {
        await deleteApp(
          bot.herokuAppName
        );
      } catch {}

      if (
        bot.isTrial &&
        bot.phoneNumber
      ) {
        await TrialCheck.findOneAndUpdate(
          {
            phoneNumber:
              bot.phoneNumber,
          },
          {
            status: "trial_ended",
          }
        );

        const botOwner =
          await User.findById(
            bot.userId
          );

        if (botOwner) {
          await BlockedTrial.findOneAndUpdate(
            {
              phoneNumber:
                bot.phoneNumber,
            },
            {
              phoneNumber:
                bot.phoneNumber,
              email: botOwner.email,
            },
            {
              upsert: true,
            }
          );
        }
      }

      await Bot.deleteOne({
        _id: bot._id,
      });

      await User.updateOne(
        {
          _id: req.user!._id,
        },
        {
          $pull: {
            bots: bot._id,
          },
        }
      );

      res.json({
        success: true,
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Delete failed",
      });
    }
  }
);

export default router;
