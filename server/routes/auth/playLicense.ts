import {
  Router,
  type Response,
  type NextFunction,
} from "express";

import {
  authGuard,
  type AuthRequest,
} from "../../middleware/auth.js";

import { User } from "../../models/User.js";

import {
  createPlayNonce,
  decodeIntegrityToken,
  validateIntegrityPayload,
  getPlayPackageName,
} from "../../services/playIntegrity.js";

const router = Router();

const NONCE_TTL_MS =
  10 * 60 * 1000;

router.get(
  "/play-license/challenge",
  authGuard,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = await User.findById(
        req.user!._id
      );

      if (!user) {
        res.status(401).json({
          error: "User not found",
        });
        return;
      }

      const nonce =
        createPlayNonce();

      user.playIntegrityNonce = nonce;
      user.playIntegrityNonceExpiresAt =
        new Date(Date.now() + NONCE_TTL_MS);

      await user.save();

      res.json({
        nonce,
        packageName: getPlayPackageName(),
        expiresAt:
          user.playIntegrityNonceExpiresAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/play-license/verify",
  authGuard,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const integrityToken =
        typeof req.body?.token === "string"
          ? req.body.token.trim()
          : "";

      if (!integrityToken) {
        res.status(400).json({
          licensed: false,
          error: "Integrity token is required",
        });
        return;
      }

      const user = await User.findById(
        req.user!._id
      );

      if (!user) {
        res.status(401).json({
          licensed: false,
          error: "User not found",
        });
        return;
      }

      if (
        !user.playIntegrityNonce ||
        !user.playIntegrityNonceExpiresAt ||
        user.playIntegrityNonceExpiresAt.getTime() <
          Date.now()
      ) {
        res.status(400).json({
          licensed: false,
          error:
            "Verification challenge expired. Request a new challenge.",
        });
        return;
      }

      const expectedNonce =
        user.playIntegrityNonce;

      const payload =
        await decodeIntegrityToken(
          integrityToken
        );

      const result =
        validateIntegrityPayload(
          payload,
          expectedNonce
        );

      /*
       * The nonce is one-time use.
       * Always invalidate it after a verification attempt.
       */
      user.playIntegrityNonce = "";
      user.playIntegrityNonceExpiresAt = null;

      if (!result.licensed) {
        user.appLicenseStatus =
          "unlicensed";
        user.appLicenseVerifiedAt = null;

        await user.save();

        res.status(403).json({
          licensed: false,
          error: result.reason,
        });

        return;
      }

      user.appLicenseStatus =
        "licensed";

      user.appLicenseVerifiedAt =
        new Date();

      await user.save();

      res.json({
        licensed: true,
        verifiedAt:
          user.appLicenseVerifiedAt,
        packageName:
          getPlayPackageName(),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
