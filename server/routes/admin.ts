import { Router } from "express";
import { adminAuth } from "./admin/shared.js";
import dashboardRouter from "./admin/dashboard.js";
import usersRouter from "./admin/users.js";
import botsRouter from "./admin/bots.js";
import transactionsRouter from "./admin/transactions.js";
import catalogRouter from "./admin/catalog.js";
import teamsRouter from "./admin/teams.js";
import systemRouter from "./admin/system.js";
import boostRouter from "./admin/boost.js";
import notificationsRouter from "./admin/notifications.js";
import featureFlagsRouter from "./admin/featureFlags.js";
import messagingRouter from "./admin/messaging.js";
import outageRouter from "./admin/outage.js";

const router = Router();

router.use(adminAuth);
router.use(dashboardRouter);
router.use(usersRouter);
router.use(botsRouter);
router.use(transactionsRouter);
router.use(catalogRouter);
router.use(teamsRouter);
router.use(systemRouter);
router.use(boostRouter);
router.use(notificationsRouter);
router.use(featureFlagsRouter);
router.use(messagingRouter);
router.use(outageRouter);

export default router;
