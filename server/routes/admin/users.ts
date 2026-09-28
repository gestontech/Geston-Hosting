import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../../models/User.js";
import { Bot } from "../../models/Bot.js";
import { deleteApp } from "../../services/heroku.js";
import { ADMIN_EMAIL } from "./shared.js";
import type {
  Request,
  Response,
  NextFunction,
} from "express";

const router = Router();

router.get(
  "/users",
  async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const users =
        await User.find({
          email: {
            $ne: ADMIN_EMAIL,
          },
        }).lean();

      const bots =
        await Bot.find({}).lean();

      const botCountMap: Record<
        string,
        number
      > = {};

      for (const bot of bots) {
        const id =
          bot.userId?.toString();

        if (!id) continue;

        botCountMap[id] =
          (botCountMap[id] || 0) + 1;
      }

      res.json(
        users.map((user) => ({
          _id: user._id,
          email: user.email,
          username:
            user.username || "",

          /*
           * txCoins is intentionally not
           * exposed anymore. The database
           * field may remain for legacy data,
           * but it is not part of the free-mode
           * administration API.
           */

          botCount:
            botCountMap[
              user._id.toString()
            ] || 0,

          isBanned:
            (
              user as unknown as {
                isBanned?: boolean;
              }
            ).isBanned || false,

          banReason:
            (
              user as unknown as {
                banReason?: string;
              }
            ).banReason || "",

          createdAt:
            (
              user as unknown as {
                createdAt?: Date;
              }
            ).createdAt,

          usedFreeTrial:
            (
              user as unknown as {
                usedFreeTrial?: boolean;
              }
            ).usedFreeTrial || false,

          referralCode:
            (
              user as unknown as {
                referralCode?: string;
              }
            ).referralCode || "",

          authProvider:
            (
              user as unknown as {
                authProvider?: string;
              }
            ).authProvider ||
            "local",

          isModerator:
            (
              user as unknown as {
                isModerator?: boolean;
              }
            ).isModerator || false,

          isAdmin:
            (
              user.email || ""
            ).toLowerCase() ===
            ADMIN_EMAIL,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/users/:id/ban",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { reason } =
        req.body || {};

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            isBanned: true,
            banReason:
              reason ||
              "Banned by admin",
            bannedAt: new Date(),
          },
          {
            new: true,
          }
        );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/users/:id/unban",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            isBanned: false,
            banReason: "",
            bannedAt: null,
          },
          {
            new: true,
          }
        );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

/*
 * Legacy Coins endpoint.
 *
 * Kept temporarily so older clients receive
 * a deterministic response instead of causing
 * an unhandled 404. No balance is changed.
 */
router.post(
  "/users/:id/tx",
  async (
    _req: Request,
    res: Response
  ) => {
    res.status(410).json({
      ok: false,
      error:
        "Coins operations are no longer available. Geston Hosting is free.",
    });
  }
);

/*
 * Legacy Coins subtraction endpoint.
 */
router.post(
  "/users/:id/subtract-tx",
  async (
    _req: Request,
    res: Response
  ) => {
    res.status(410).json({
      ok: false,
      error:
        "Coins operations are no longer available. Geston Hosting is free.",
    });
  }
);

router.post(
  "/users/:id/password",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { password } =
        req.body || {};

      if (
        !password ||
        password.length < 6
      ) {
        res.status(400).json({
          error:
            "Password too short",
        });
        return;
      }

      const hash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            passwordHash: hash,
          },
          {
            new: true,
          }
        );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/users/:id/notify",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const {
        title,
        message,
      } = req.body || {};

      const cleanTitle =
        String(title || "")
          .trim();

      const cleanMessage =
        String(message || "")
          .trim();

      if (
        !cleanTitle ||
        !cleanMessage
      ) {
        res.status(400).json({
          error:
            "Title and message are required",
        });
        return;
      }

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      const {
        createNotification,
      } = await import(
        "../../services/notifications.js"
      );

      await createNotification(
        user._id,
        "general",
        cleanTitle.slice(0, 200),
        cleanMessage.slice(0, 2000)
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/users/:id",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user =
        await User.findByIdAndDelete(
          req.params.id
        );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      const userBots =
        await Bot.find({
          userId: req.params.id,
        });

      await Promise.all(
        userBots.map(
          async (bot) => {
            try {
              await deleteApp(
                bot.herokuAppName
              );
            } catch {
              // Continue deletion even
              // when the provider app is
              // already unavailable.
            }
          }
        )
      );

      await Bot.deleteMany({
        userId: req.params.id,
      });

      res.json({
        ok: true,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/users/:id/moderator",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      const newStatus =
        !user.isModerator;

      user.isModerator =
        newStatus;

      /*
       * Free mode:
       * moderator promotion no longer
       * grants Coins.
       */
      await user.save();

      if (newStatus) {
        const {
          createNotification,
        } = await import(
          "../../services/notifications.js"
        );

        await createNotification(
          user._id,
          "general",
          "You've been promoted to Moderator!",
          "Congratulations! You now have moderator status on Geston Hosting."
        ).catch(() => {});
      }

      res.json({
        ok: true,
        isModerator:
          newStatus,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
