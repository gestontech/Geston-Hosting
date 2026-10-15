import { Router } from "express";
import coreRouter from "./payments/core.js";
import drcRouter from "./payments/drc.js";
const router = Router();
router.use(coreRouter);
router.use(drcRouter);
export { optGatewayWebhookHandler } from "./payments/optgatewayWebhook.js";
export default router;
