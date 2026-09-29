import type {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";

import {
  User,
  type IUser,
} from "../models/User.js";

import { JWT_SECRET } from "../lib/env.js";

export interface AuthRequest
  extends Request {
  user?: IUser;
  viaApiKey?: boolean;
}

const LICENSE_CACHE_MS =
  Number(
    process.env.PLAY_LICENSE_CACHE_MS
  ) ||
  24 * 60 * 60 * 1000;

function isAdminUser(
  user: IUser
): boolean {
  const adminEmail =
    (
      process.env.ADMIN_EMAIL ||
      ""
    ).trim().toLowerCase();

  if (!adminEmail) {
    return false;
  }

  return (
    user.email.trim().toLowerCase() ===
    adminEmail
  );
}

export function hasValidAppLicense(
  user: IUser
): boolean {
  /*
   * The configured administrator is allowed to use
   * the service without a Google Play licence.
   */
  if (isAdminUser(user)) {
    return true;
  }

  if (
    user.appLicenseStatus !==
    "licensed"
  ) {
    return false;
  }

  if (
    !user.appLicenseVerifiedAt
  ) {
    return false;
  }

  const verifiedAt =
    user.appLicenseVerifiedAt.getTime();

  if (!Number.isFinite(verifiedAt)) {
    return false;
  }

  const age =
    Date.now() - verifiedAt;

  if (age < 0) {
    return false;
  }

  return age <= LICENSE_CACHE_MS;
}

function shouldSkipPaidCheck(
  req: Request
): boolean {
  /*
   * /me is intentionally accessible to an authenticated
   * but not-yet-licensed user so the application can
   * determine its current licence state.
   */
  if (req.path === "/me") {
    return true;
  }

  /*
   * The Google Play licence handshake must be accessible
   * before the licence has been verified.
   */
  if (
    req.path === "/play-license" ||
    req.path.startsWith(
      "/play-license/"
    )
  ) {
    return true;
  }

  return false;
}

export async function authGuard(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace(
        /^Bearer\s+/i,
        ""
      );

    if (!token) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      ) as {
        userId?: string;
      };

    if (!decoded?.userId) {
      res.status(401).json({
        error: "Invalid token",
      });
      return;
    }

    const user =
      await User.findById(
        decoded.userId
      ).lean();

    if (!user) {
      res.status(401).json({
        error: "User not found",
      });
      return;
    }

    req.user =
      user as unknown as IUser;

    /*
     * Everything except the licence handshake and /me
     * requires a valid application licence.
     *
     * The administrator is explicitly exempted by
     * hasValidAppLicense().
     */
    if (
      !shouldSkipPaidCheck(req) &&
      !hasValidAppLicense(req.user)
    ) {
      res.status(403).json({
        error:
          "Geston Hosting requires a valid Google Play licence for the Android application.",
        code:
          "APP_LICENSE_REQUIRED",
      });
      return;
    }

    next();
  } catch {
    res.status(401).json({
      error: "Invalid token",
    });
  }
}
