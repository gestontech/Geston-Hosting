import { Router } from "express";
import { z } from "zod";
import { Coupon } from "../models/Coupon.js";
import { User } from "../models/User.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";

const router = Router();

router.use(authGuard);
router.use(banCheck);

/**
 * Coupons previously existed as a Coins-credit mechanism.
 *
 * Geston Hosting is now permanently free, so coupons no longer
 * create or transfer virtual currency.
 *
 * The endpoint remains temporarily available so old clients
 * receive a clear response instead of a generic 404.
 */
router.post(
  "/claim",
  async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        code: z.string().min(1),
      });

      const parsed = schema.safeParse(
        req.body
      );

      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: "Invalid coupon code",
        });
        return;
      }

      const upperCode =
        parsed.data.code
          .toUpperCase()
          .trim();

      const coupon =
        await Coupon.findOne({
          code: upperCode,
        });

      if (!coupon) {
        res.status(404).json({
          success: false,
          error: "Invalid coupon code",
        });
        return;
      }

      res.status(410).json({
        success: false,
        error:
          "Les coupons ne sont plus nécessaires. Tous les services de Geston Hosting sont gratuits.",
      });
    } catch {
      res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

export default router;
