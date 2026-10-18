import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { User } from "../../models/User.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import { isAcceptableEmail } from "../../utils/disposableEmails.js";
import { CLIENT_URL, resetTokens, transporter, checkEmailQuota, buildEmailHtml } from "./shared.js";

const router = Router();

router.post("/forgot-password", authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid email" }); return; }
    const { email } = parsed.data;

    if (!isAcceptableEmail(email)) {
      res.status(400).json({ error: "Please use a real email address from a recognised provider." });
      return;
    }

    const quota = await checkEmailQuota(email);
    if (!quota.allowed) {
      res.status(429).json({ error: quota.error });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: "No account found with this email." });
      return;
    }
    if (!user.passwordHash) {
      res.status(400).json({ error: "This account uses GitHub or email-link login. Use those methods to sign in instead." });
      return;
    }
    if (user.isBanned) {
      res.status(403).json({ error: "Your account has been banned. Contact support." });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    resetTokens.set(resetToken, { userId: user._id.toString(), email: user.email, expires: Date.now() + 30 * 60 * 1000 });

    const resetUrl = `${CLIENT_URL}/auth/reset-password?token=${resetToken}`;
    const { subject, html } = buildEmailHtml("reset", resetUrl, user.username ?? undefined);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"GESTONX" <noreply@gestontech.online>',
      to: email,
      subject,
      html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to send reset link. Please try again." });
  }
});

router.post("/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ token: z.string(), password: z.string().min(8, "Password must be at least 8 characters") });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { token, password } = parsed.data;

    const record = resetTokens.get(token);
    if (!record || record.expires < Date.now()) {
      resetTokens.delete(token);
      res.status(400).json({ error: "Reset link expired or invalid. Please request a new one." });
      return;
    }
    resetTokens.delete(token);

    const hash = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(record.userId, { passwordHash: hash });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
