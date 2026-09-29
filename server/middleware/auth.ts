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
  7 * 24 * 60 * 60 * 1000;

function isAdminUser(
  user: IUser
): boolean {
  const adminEmail =
    (
      process.env.ADMIN_EMAIL ||
      ""
    ).toLowerCase();

  return (
    !!adminEmail &&
    user.email.toLowerCase() ===
      adminEmail
  );
}

export function hasValidAppLicense(
  user: IUser
): boolean {
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

  return (
    Date.now() -
      user.appLicenseVerifiedAt.getTime() <=
    LICENSE_CACHE_MS
  );
}

function shouldSkipPaidCheck(
  req: Request
): boolean {
  /*
   * /me must remain available so the frontend can know
   * that the authenticated user exists but is not licensed yet.
   */
  if (req.path === "/me") {
    return true;
  }

  /*
   * The Play licence handshake must be possible before
   * the user is licensed.
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
        "Bearer ",
        ""
      );

    if (!token) {
      res.status(401).json({
        error: "Unauthorized",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as {
      userId: string;
    };

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

    if (
      !shouldSkipPaidCheck(req) &&
      !hasValidAppLicense(
        req.user
      )
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
