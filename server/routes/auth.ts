import { Router } from "express";

import loginRouter from "./auth/login.js";
import magicLinkRouter from "./auth/magicLink.js";
import passwordResetRouter from "./auth/passwordReset.js";
import oauthRouter from "./auth/oauth.js";
import sessionRouter from "./auth/session.js";
import playLicenseRouter from "./auth/playLicense.js";

const router = Router();

router.use(loginRouter);
router.use(magicLinkRouter);
router.use(passwordResetRouter);
router.use(oauthRouter);
router.use(sessionRouter);
router.use(playLicenseRouter);

export default router;
