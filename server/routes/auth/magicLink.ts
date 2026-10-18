import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { User } from "../../models/User.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import { getClientIP, generateReferralCode, canRegisterWithIP, recordIPAndFingerprint } from "../../utils/fingerprint.js";
import { isAcceptableEmail } from "../../utils/disposableEmails.js";
import {
  CLIENT_URL,
  magicLinkTokens,
  pendingTokens,
  transporter,
  checkEmailQuota,
  generateToken,
  generatePendingToken,
  setAuthCookie,
  userPayload,
  buildEmailHtml,
  syncDefaultPackages,
  handleReferral,
} from "./shared.js";

const router = Router();

router.post("/magic-link/send", authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      referralCode: z.string().optional(),
      type: z.enum(["login", "signup"]).optional(),
      password: z.string().min(8).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid email or password" }); return; }
    const { email, referralCode, type, password } = parsed.data;

    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();
    const isAdmin = !!ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL;

    if (!isAdmin && !isAcceptableEmail(email)) {
      res.status(400).json({ error: "Please use a real email address from a recognised provider. Temporary, disposable, or unofficial email services are not allowed." });
      return;
    }

    if (!isAdmin) {
      const quota = await checkEmailQuota(email);
      if (!quota.allowed) {
        res.status(429).json({ error: quota.error });
        return;
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (type === "login" && !existingUser) {
      res.status(404).json({ error: "No account found with this email. Please sign up first." });
      return;
    }

    if ((type === "signup" || !type) && existingUser) {
      res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
      return;
    }

    if (existingUser?.isBanned) {
      res.status(403).json({ error: "Your account has been banned. Contact support." });
      return;
    }

    let passwordHash: string | undefined;
    if (password && !existingUser) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    const linkToken = crypto.randomBytes(32).toString("hex");
    magicLinkTokens.set(linkToken, { email: email.toLowerCase(), expires: Date.now() + 15 * 60 * 1000, referralCode, passwordHash });

    const linkUrl = `${CLIENT_URL}/auth/login?token=${linkToken}`;
    const emailType = existingUser ? "login" : "signup";
    const { subject, html } = buildEmailHtml(emailType, linkUrl, existingUser?.username ?? undefined);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"GESTONX" <noreply@gestontech.online>',
      to: email,
      subject,
      html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Magic link error:", err);
    res.status(500).json({ error: "Failed to send link. Please try again." });
  }
});

router.get("/magic-link/verify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) { res.status(400).json({ error: "Missing token" }); return; }

    const record = magicLinkTokens.get(token);
    if (!record || record.expires < Date.now()) {
      magicLinkTokens.delete(token);
      res.status(400).json({ error: "Link expired or invalid. Please request a new one." });
      return;
    }
    magicLinkTokens.delete(token);

    const { email, referralCode } = record;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.isBanned) { res.status(403).json({ error: existingUser.banReason ? `Your account has been banned: ${existingUser.banReason}` : "Your account has been banned.", isBanned: true, banReason: existingUser.banReason || "" }); return; }
      const jwtToken = generateToken(existingUser._id.toString());
      setAuthCookie(res, jwtToken);
      res.json({ token: jwtToken, user: userPayload(existingUser) });
    } else {
      const pendingToken = generatePendingToken(email, referralCode, record.passwordHash);
      res.json({ needsUsername: true, pendingToken });
    }
  } catch (err) {
    next(err);
  }
});

router.post("/set-username", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const pendingToken = authHeader?.replace("Bearer ", "");
    if (!pendingToken) { res.status(401).json({ error: "Missing token" }); return; }

    const record = pendingTokens.get(pendingToken);
    if (!record || record.expires < Date.now()) {
      pendingTokens.delete(pendingToken);
      res.status(400).json({ error: "Session expired. Please start again." });
      return;
    }

    const schema = z.object({
      username: z.string().max(20).regex(/^[a-z0-9_]*$/i).optional().or(z.literal("")).optional(),
      fingerprint: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid username. Up to 20 characters, letters/numbers/underscores only." }); return; }

    const { email, referralCode, passwordHash: storedPasswordHash } = record;
    const ip = getClientIP(req);

    const ipCheck = await canRegisterWithIP(ip, parsed.data.fingerprint || "");
    if (!ipCheck.allowed) { res.status(403).json({ error: ipCheck.reason }); return; }

    const providedUsername = (parsed.data.username || "").trim();
    if (providedUsername && (providedUsername.length < 3 || providedUsername.length > 20)) {
      res.status(400).json({ error: "Username must be 3-20 characters." }); return;
    }

    let uname: string;
    if (!providedUsername) {
      let candidate = `user${crypto.randomBytes(4).toString("hex")}`;
      const exists = await User.findOne({ username: candidate });
      if (exists) candidate = `user${crypto.randomBytes(4).toString("hex")}`;
      uname = candidate;
    } else {
      uname = providedUsername.toLowerCase();
    }

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email }),
      providedUsername ? User.findOne({ username: uname }) : Promise.resolve(null),
    ]);
    if (existingEmail) { res.status(409).json({ error: "Account already exists. Please login instead." }); return; }
    if (existingUsername) { res.status(409).json({ error: "Username already taken" }); return; }

    await syncDefaultPackages();
    const refCode = generateReferralCode();
    const user = await User.create({
      email,
      username: uname,
      passwordHash: storedPasswordHash || "",
      txCoins: 0,
      referralCode: refCode,
      authProvider: "local",
      currency: "USD",
      currencySet: true,
    });

    pendingTokens.delete(pendingToken);
    await recordIPAndFingerprint(ip, user._id.toString(), parsed.data.fingerprint || "");
    await handleReferral(user._id, referralCode, ip);

    const jwtToken = generateToken(user._id.toString());
    setAuthCookie(res, jwtToken);
    res.json({ token: jwtToken, user: userPayload(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
