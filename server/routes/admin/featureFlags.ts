import { Router, type Request, type Response, type NextFunction } from "express";
import {
  getDisabledServices,
  getDisabledPaymentMethods,
  setDisabledServices,
  setDisabledPaymentMethods,
} from "../../lib/featureFlags.js";

const router = Router();

router.get("/feature-flags", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [disabledServices, disabledPaymentMethods] = await Promise.all([
      getDisabledServices(),
      getDisabledPaymentMethods(),
    ]);
    res.json({ disabledServices, disabledPaymentMethods });
  } catch (err) { next(err); }
});

router.post("/feature-flags/services", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, disabled } = req.body ?? {};
    if (typeof key !== "string" || !key.trim() || typeof disabled !== "boolean") {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const current = await getDisabledServices();
    const nextKeys = disabled
      ? Array.from(new Set([...current, key]))
      : current.filter(k => k !== key);
    await setDisabledServices(nextKeys);
    res.json({ ok: true, disabledServices: nextKeys });
  } catch (err) { next(err); }
});

router.post("/feature-flags/payment-methods", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, disabled } = req.body ?? {};
    if (typeof key !== "string" || !key.trim() || typeof disabled !== "boolean") {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const current = await getDisabledPaymentMethods();
    const nextKeys = disabled
      ? Array.from(new Set([...current, key]))
      : current.filter(k => k !== key);
    await setDisabledPaymentMethods(nextKeys);
    res.json({ ok: true, disabledPaymentMethods: nextKeys });
  } catch (err) { next(err); }
});

export default router;
