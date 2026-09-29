import type { Response, NextFunction } from "express";
import { User, type IUser } from "../models/User.js";
import type { AuthRequest } from "./auth.js";
import { hashApiKey } from "../utils/apiKey.js";
import { hasValidAppLicense } from "./auth.js";

export const apiKeyGuard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const raw =
      req.headers.authorization?.replace(
        /^Bearer\s+/i,
        ""
      ) ||
      (req.headers["x-api-key"] as string) ||
      "";

    if (!raw) {
      res.status(401).json({
        success: false,
        error: "Missing API key",
      });
      return;
    }

    const hash = hashApiKey(raw);

    const user = await User.findOne({
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

    /*
     * Every API-key request must belong to an account
     * with a valid Google Play application licence.
     *
     * hasValidAppLicense() also preserves the configured
     * administrator bypass.
     */
    if (
      !hasValidAppLicense(
        user as unknown as IUser
      )
    ) {
      res.status(403).json({
        success: false,
        error:
          "Geston Hosting requires a valid Google Play licence for the Android application.",
        code: "APP_LICENSE_REQUIRED",
      });
      return;
    }

    req.user =
      user as unknown as IUser;

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
};
