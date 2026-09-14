import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { User } from "../../models/User.js";
import { Referral } from "../../models/Referral.js";
import { IPRecord } from "../../models/IPRecord.js";
import { Package } from "../../models/Package.js";
import { JWT_SECRET } from "../../lib/env.js";

export const CLIENT_URL = (process.env.CLIENT_URL || process.env.APP_URL || process.env.SITE_URL || "").replace(/\/$/, "");
const CLIENT_HOST = (() => {
  if (!CLIENT_URL) return "";
  try { return new URL(CLIENT_URL).host; } catch { return CLIENT_URL.replace(/^https?:\/\//, ""); }
})();

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASS,
  },
});

export const magicLinkTokens = new Map<string, { email: string; expires: number; referralCode?: string; passwordHash?: string }>();
export const pendingTokens = new Map<string, { email: string; referralCode?: string; expires: number; passwordHash?: string }>();
export const resetTokens = new Map<string, { userId: string; email: string; expires: number }>();

const EMAIL_DAILY_LIMIT = 3;

export async function checkEmailQuota(email: string): Promise<{ allowed: boolean; error?: string }> {
  const { EmailQuota } = await import("../../models/EmailQuota.js");
  const today = new Date().toISOString().slice(0, 10);
  const key = email.toLowerCase();
  const expiresAt = new Date(Date.now() + 49 * 60 * 60 * 1000);
  const limitError = `Vous avez atteint la limite quotidienne d'e-mails (${EMAIL_DAILY_LIMIT} par jour). Veuillez réessayer demain.`;

  const updated = await EmailQuota.findOneAndUpdate(
    { email: key, date: today, count: { $lt: EMAIL_DAILY_LIMIT } },
    { $inc: { count: 1 } },
    { new: true }
  );
  if (updated) return { allowed: true };

  try {
    await EmailQuota.create({ email: key, date: today, count: 1, expiresAt });
    return { allowed: true };
  } catch (err: any) {
    if (err.code === 11000) {
      const retry = await EmailQuota.findOneAndUpdate(
        { email: key, date: today, count: { $lt: EMAIL_DAILY_LIMIT } },
        { $inc: { count: 1 } },
        { new: true }
      );
      if (retry) return { allowed: true };
    }
    return { allowed: false, error: limitError };
  }
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function generatePendingToken(email: string, referralCode?: string, passwordHash?: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  pendingTokens.set(token, { email, referralCode, expires: Date.now() + 30 * 60 * 1000, passwordHash });
  return token;
}

export function setAuthCookie(res: any, token: string) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function userPayload(user: any) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  return {
    id: user._id,
    email: user.email,
    username: user.username,
    txCoins: user.txCoins,
    isBanned: user.isBanned,
    banReason: user.banReason || "",
    referralCode: user.referralCode,
    avatarUrl: user.avatarUrl || "",
    authProvider: user.authProvider || "local",
    isModerator: user.isModerator || false,
    isAdmin: !!adminEmail && (user.email || "").toLowerCase() === adminEmail,
    currency: user.currency || "USD",
    currencySet: !!user.currencySet,
  };
}

export function buildEmailHtml(type: "login" | "signup" | "reset", url: string, username?: string): { subject: string; html: string } {
  const footerLink = CLIENT_URL
    ? `<a href="${CLIENT_URL}" style="color:#6b7280;text-decoration:none">${CLIENT_HOST || CLIENT_URL}</a>`
    : "Geston Hosting";
  const wrap = (body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;max-width:520px;width:100%">
<tr><td style="padding:28px 32px;background:linear-gradient(135deg,#1e1b4b,#0f172a);border-bottom:1px solid #1f2937;text-align:center">
<span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px"> Geston Hosting</span>
</td></tr>
<tr><td style="padding:36px 32px">${body}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #1f2937;text-align:center">
<p style="margin:0;font-size:12px;color:#4b5563">Si vous n'avez pas demandé cela, vous pouvez ignorer cet e-mail en toute sécurité.</p>
<p style="margin:6px 0 0;font-size:12px;color:#374151">Cordialement, <strong style="color:#9ca3af">Geston</strong> &mdash; GestonTech &middot; ${footerLink}</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  const btnStyle = `display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px`;
  const linkStyle = `color:#7c3aed;word-break:break-all`;

  if (type === "signup") {
    return {
      subject: "Bienvenue sur Geston Hosting — Finalisez votre inscription",
      html: wrap(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#fff">Bienvenue sur Geston Hosting ! 🎉</h1>
        <p style="margin:0 0 6px;font-size:15px;color:#9ca3af;line-height:1.6">Merci de vous être inscrit. Vous êtes à une étape de déployer votre premier bot.</p>
        <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6">Cliquez sur le bouton ci-dessous pour vérifier votre e-mail et finaliser la configuration de votre compte. Ce lien expire dans <strong style="color:#9ca3af">15 minutes</strong>.</p>
        <a href="${url}" style="${btnStyle}">Finaliser l'inscription &rarr;</a>
        <p style="margin:28px 0 0;font-size:12px;color:#4b5563;line-height:1.8">Ou copiez ce lien dans votre navigateur :<br><a href="${url}" style="${linkStyle}">${url}</a></p>
      `),
    };
  }

  if (type === "reset") {
    return {
      subject: "Réinitialisez votre mot de passe — Geston Hosting",
      html: wrap(`
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff">Réinitialiser votre mot de passe</h1>
        ${username ? `<p style="margin:0 0 6px;font-size:14px;color:#6b7280">Bonjour <strong style="color:#9ca3af">@${username}</strong>,</p>` : ""}
        <p style="margin:0 0 28px;font-size:14px;color:#9ca3af;line-height:1.6">Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Geston Hosting. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien expire dans <strong style="color:#d1d5db">30 minutes</strong> et ne peut être utilisé qu'une seule fois.</p>
        <a href="${url}" style="${btnStyle}">Réinitialiser le mot de passe &rarr;</a>
        <p style="margin:28px 0 0;font-size:12px;color:#4b5563;line-height:1.8">Ou copiez ce lien :<br><a href="${url}" style="${linkStyle}">${url}</a></p>
        <p style="margin:16px 0 0;font-size:12px;color:#4b5563">Si vous n'avez pas demandé de réinitialisation, votre mot de passe restera inchangé — aucune action n'est nécessaire.</p>
      `),
    };
  }

  return {
    subject: "Votre lien de connexion — Geston Hosting",
    html: wrap(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff">Votre lien de connexion</h1>
      ${username ? `<p style="margin:0 0 6px;font-size:14px;color:#6b7280">Bonjour <strong style="color:#9ca3af">@${username}</strong>,</p>` : ""}
      <p style="margin:0 0 28px;font-size:14px;color:#9ca3af;line-height:1.6">Cliquez sur le bouton ci-dessous pour vous connecter à votre compte Geston Hosting. Ce lien expire dans <strong style="color:#d1d5db">15 minutes</strong> et ne peut être utilisé qu'une seule fois.</p>
      <a href="${url}" style="${btnStyle}">Se connecter à Geston Hosting &rarr;</a>
      <p style="margin:28px 0 0;font-size:12px;color:#4b5563;line-height:1.8">Ou copiez ce lien :<br><a href="${url}" style="${linkStyle}">${url}</a></p>
    `),
  };
}

export async function syncDefaultPackages(): Promise<void> {
  const packages = [
    { name: "Starter", ksPrice: 50, txAmount: 10, bonusTx: 0, isBestDeal: false, order: 1, active: true },
    { name: "Basic", ksPrice: 100, txAmount: 20, bonusTx: 0, isBestDeal: false, order: 2, active: true },
    { name: "Standard", ksPrice: 150, txAmount: 30, bonusTx: 0, isBestDeal: false, order: 3, active: true },
    { name: "Pro", ksPrice: 250, txAmount: 50, bonusTx: 5, isBestDeal: true, order: 4, active: true },
    { name: "Elite", ksPrice: 500, txAmount: 100, bonusTx: 10, isBestDeal: false, order: 5, active: true },
    { name: "Ultimate", ksPrice: 1000, txAmount: 200, bonusTx: 20, isBestDeal: false, order: 6, active: true },
  ];
  for (const pkg of packages) {
    await Package.findOneAndUpdate({ order: pkg.order }, { $set: pkg }, { upsert: true });
  }
}

export async function handleReferral(userId: any, referralCode: string | null | undefined, ip: string) {
  if (!referralCode) return;
  const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
  if (!referrer) return;
  const referrerId = referrer._id;
  const existingReferral = await Referral.findOne({ referredId: userId });
  if (existingReferral) return;
  const { Transaction } = await import("../../models/Transaction.js");
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [referrerIPRecords, recentReferralCount] = await Promise.all([
    IPRecord.find({ userId: referrerId.toString() }, { ip: 1 }).lean(),
    Referral.countDocuments({ referrerId, createdAt: { $gte: hourAgo } }),
  ]);
  const referrerIPs = new Set(referrerIPRecords.map((r: { ip: string }) => r.ip));
  const sameIP = referrerIPs.has(ip);
  const isAbuse = sameIP || recentReferralCount >= 3;
  if (isAbuse) {
    const flagReason = sameIP ? "referrer_ip_match" : "referral_rate_limit";
    await Referral.create({ referrerId, referredId: userId, txRewarded: 0, flagged: true, flagReason });
    if (sameIP) {
      await User.findByIdAndUpdate(referrerId, { $set: { isBanned: true, banReason: "Referral abuse detected: same-IP self-referral" } });
    }
  } else {
    await Referral.create({ referrerId, referredId: userId, txRewarded: 2 });
    await User.findByIdAndUpdate(referrerId, { $inc: { txCoins: 2 } });
    await Transaction.create({ userId: referrerId, type: "admin_grant", txAmount: 2, ksAmount: 0, status: "success" });
    await User.findByIdAndUpdate(userId, { $inc: { txCoins: 2 } });
    await Transaction.create({ userId, type: "admin_grant", txAmount: 2, ksAmount: 0, status: "success" });
  }
}
