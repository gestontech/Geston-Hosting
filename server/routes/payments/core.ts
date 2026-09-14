import { Router, type Request, type Response, type NextFunction } from "express";
import { Package } from "../../models/Package.js";
import { PAYSTACK_PUBLIC_KEY, getNigeriaPublicKey, isNigeriaAvailable } from "../../services/paystack.js";
import { isCameroonAvailable } from "../../services/fapshi.js";
import { isTanzaniaAvailable } from "../../services/speedpesa.js";
import { isDRCAvailable } from "../../services/wonyapay.js";
import { getDisabledPaymentMethods } from "../../lib/featureFlags.js";

const router = Router();

function isSouthAfricaAvailable(): boolean {
  return !!(process.env.PAYSTACK_SA_SECRET_KEY && process.env.PAYSTACK_SA_PUBLIC_KEY);
}

function isGhanaAvailable(): boolean {
  return !!(process.env.PAYSTACK_GHANA_SECRET_KEY && process.env.PAYSTACK_GHANA_PUBLIC_KEY);
}

router.get("/config", async (_req, res) => {
  const disabled = await getDisabledPaymentMethods();
  res.json({
    paystackPublicKey: PAYSTACK_PUBLIC_KEY,
    nigeriaPublicKey: getNigeriaPublicKey(),
    kenyaAvailable: !disabled.includes("kenya"),
    nigeriaAvailable: isNigeriaAvailable() && !disabled.includes("nigeria"),
    cameroonAvailable: isCameroonAvailable() && !disabled.includes("cameroon"),
    southAfricaAvailable: isSouthAfricaAvailable() && !disabled.includes("southAfrica"),
    ghanaAvailable: isGhanaAvailable() && !disabled.includes("ghana"),
    tanzaniaAvailable: isTanzaniaAvailable() && !disabled.includes("tanzania"),
    drcAvailable: isDRCAvailable() && !disabled.includes("drc"),
    paypalAvailable: !disabled.includes("paypal"),
    cardAvailable: !disabled.includes("card"),
  });
});

router.get("/packages", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const packages = await Package.find({ active: true }).sort({ order: 1 }).lean();
    res.json(packages);
  } catch (err) {
    next(err);
  }
});

export default router;
