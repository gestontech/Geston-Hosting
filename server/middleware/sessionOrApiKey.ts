import type {
  Response,
  NextFunction,
} from "express";

import {
  User,
  type IUser,
} from "../models/User.js";

import type { AuthRequest } from "./auth.js";

import {
  authGuard,
  hasValidAppLicense,
} from "./auth.js";

import {
  hashApiKey,
  looksLikeApiKey,
} from "../utils/apiKey.js";

export const sessionOrApiKeyGuard =
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    const bearer =
      req.headers.authorization?.replace(
        "Bearer ",
        ""
      ) ||
      (req.headers[
        "x-api-key"
      ] as string) ||
      "";

    if (looksLikeApiKey(bearer)) {
      try {
        const hash =
          hashApiKey(bearer);

        const user =
          await User.findOne({
            apiKeyHash: hash,
          });

        if (!user) {
          res.status(401).json({
            success: false,
            error: "Invalid API key",
          });
          return;
        }

        if (!user.apiKeyActive) {
          res.status(403).json({
            success: false,
            error: "API key is paused",
          });
          return;
        }

        if (user.isBanned) {
          res.status(403).json({
            success: false,
            error: "Account suspended",
          });
          return;
        }

        if (
          !hasValidAppLicense(
            user as unknown as IUser
          )
        ) {
          res.status(403).json({
            success: false,
            error:
              "Geston Hosting requires a valid Google Play licence for the Android application.",
            code:
              "APP_LICENSE_REQUIRED",
          });
          return;
        }

        req.user =
          user as unknown as IUser;

        req.viaApiKey = true;

        User.updateOne(
          { _id: user._id },
          {
            $inc: {
              apiCallCount: 1,
            },
            $set: {
              apiKeyLastUsedAt:
                new Date(),
            },
          }
        ).catch(() => {});

        next();
      } catch {
        res.status(500).json({
          success: false,
          error: "Server error",
        });
      }

      return;
    }

    authGuard(req, res, next);
  };
