import { Router } from "express";
import catalogRouter from "./boost/catalog.js";
import ordersRouter from "./boost/orders.js";
import mpesaRouter from "./boost/mpesa.js";
import drcRouter from "./boost/drc.js";
import cameroonRouter from "./boost/cameroon.js";
import tanzaniaRouter from "./boost/tanzania.js";
import cardRouter from "./boost/card.js";
import { isServiceDisabled } from "../lib/featureFlags.js";

const router = Router();

router.use(async (_req, res, next) => {
  if (await isServiceDisabled("boost")) {
    res.status(503).json({ error: "Social media boosting is currently disabled", serviceDisabled: "boost" });
    return;
  }
  next();
});

router.use(catalogRouter);
router.use(ordersRouter);
router.use(mpesaRouter);
router.use(drcRouter);
router.use(cameroonRouter);
router.use(tanzaniaRouter);
router.use(cardRouter);

export default router;
