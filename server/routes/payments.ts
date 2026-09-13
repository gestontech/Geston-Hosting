import { Router } from "express";
import coreRouter from "./payments/core.js";
import kenyaRouter from "./payments/kenya.js";
import nigeriaRouter from "./payments/nigeria.js";
import cameroonRouter from "./payments/cameroon.js";
import tanzaniaRouter from "./payments/tanzania.js";
import drcRouter from "./payments/drc.js";
import paypalRouter from "./payments/paypal.js";

const router = Router();

router.use(coreRouter);
router.use(kenyaRouter);
router.use(nigeriaRouter);
router.use(cameroonRouter);
router.use(tanzaniaRouter);
router.use(drcRouter);
router.use(paypalRouter);

export { paystackWebhookHandler, speedpesaWebhookHandler, wonyaWebhookHandler } from "./payments/webhooks.js";
export default router;
