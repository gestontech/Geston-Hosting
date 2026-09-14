import { Router } from "express";
import { sessionOrApiKeyGuard } from "../middleware/sessionOrApiKey.js";
import { banCheck } from "../middleware/banCheck.js";
import trialCheckRouter from "./bots/trialCheck.js";
import listRouter from "./bots/list.js";
import deployRouter from "./bots/deploy.js";
import lifecycleRouter from "./bots/lifecycle.js";
import removeRouter from "./bots/remove.js";
import logsRouter from "./bots/logs.js";

const router = Router();

// Public (no auth)
router.use(trialCheckRouter);
// GET /template-appvars/:id is public (reads public GitHub app.json only).
// POST /deploy and /deploy-template are protected by authGuard inside deploy.ts.
router.use(deployRouter);

// Everything else requires login / API key
router.use(sessionOrApiKeyGuard);
router.use(banCheck);

router.use(listRouter);
router.use(lifecycleRouter);
router.use(removeRouter);
router.use(logsRouter);

export default router;
