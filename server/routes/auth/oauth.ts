import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { User } from "../../models/User.js";
import { getClientIP, generateReferralCode, canRegisterWithIP, recordIPAndFingerprint } from "../../utils/fingerprint.js";
import { CLIENT_URL, generateToken, setAuthCookie, syncDefaultPackages, handleReferral } from "./shared.js";

const router = Router();

router.get("/google", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) { res.redirect(`${CLIENT_URL}/login?error=google_not_configured`); return; }
  const referralCode = (req.query.ref as string) || "";
  const intent = (req.query.intent as string) || "signup";
  const state = Buffer.from(JSON.stringify({ referralCode, csrf: crypto.randomBytes(8).toString("hex"), intent })).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${CLIENT_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    if (!code) { res.redirect(`${CLIENT_URL}/login?error=google_denied`); return; }

    let referralCode = "";
    let intent = "signup";
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      referralCode = decoded.referralCode || "";
      intent = decoded.intent || "signup";
    } catch { }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${CLIENT_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) { res.redirect(`${CLIENT_URL}/login?error=google_token`); return; }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json() as any;

    const primaryEmail = profile.email;
    if (!primaryEmail) { res.redirect(`${CLIENT_URL}/login?error=google_no_email`); return; }

    const ip = getClientIP(req);
    let isNew = false;
    let user = await User.findOne({ googleId: String(profile.id) });

    if (!user) {
      user = await User.findOne({ email: primaryEmail });
      if (user) {
        await User.findByIdAndUpdate(user._id, { googleId: String(profile.id), avatarUrl: profile.picture || user.avatarUrl || "" });
        user = await User.findById(user._id);
      } else {
        if (intent === "login") { res.redirect(`${CLIENT_URL}/login?error=google_no_account`); return; }
        const ipCheck = await canRegisterWithIP(ip, "");
        if (!ipCheck.allowed) { res.redirect(`${CLIENT_URL}/login?error=google_server`); return; }

        await syncDefaultPackages();
        const refCode = generateReferralCode();
        let username = (profile.name || "").toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 20);
        if (username.length < 3) username = `user${crypto.randomBytes(3).toString("hex")}`;
        const existingUsername = await User.findOne({ username });
        if (existingUsername) username = `${username.slice(0, 16)}${crypto.randomBytes(2).toString("hex")}`;

        user = await User.create({
          email: primaryEmail,
          username,
          googleId: String(profile.id),
          avatarUrl: profile.picture || "",
          passwordHash: "",
          txCoins: 0,
          referralCode: refCode,
          authProvider: "google",
          currency: "USD",
          currencySet: true,
        });
        isNew = true;
        await recordIPAndFingerprint(ip, user._id.toString(), "");
        await handleReferral(user._id, referralCode, ip);
      }
    }

    if (!user) { res.redirect(`${CLIENT_URL}/login?error=google_server`); return; }
    if (user.isBanned) { res.redirect(`${CLIENT_URL}/login?error=banned`); return; }

    const jwtToken = generateToken(user._id.toString());
    setAuthCookie(res, jwtToken);
    res.redirect(`${CLIENT_URL}/auth/github/success?token=${jwtToken}&provider=google${isNew ? "&is_new=1" : ""}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${CLIENT_URL}/login?error=google_server`);
  }
});

router.get("/github", (req, res) => {
  const referralCode = (req.query.ref as string) || "";
  const intent = (req.query.intent as string) || "signup";
  const state = Buffer.from(JSON.stringify({ referralCode, csrf: crypto.randomBytes(8).toString("hex"), intent })).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || "",
    redirect_uri: `${CLIENT_URL}/api/auth/github/callback`,
    scope: "user:email",
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get("/github/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    if (!code) { res.redirect(`${CLIENT_URL}/login?error=github_denied`); return; }

    let referralCode = "";
    let intent = "signup";
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      referralCode = decoded.referralCode || "";
      intent = decoded.intent || "signup";
    } catch { }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) { res.redirect(`${CLIENT_URL}/login?error=github_token`); return; }

    const [profileRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Geston-Hosting" } }),
      fetch("https://api.github.com/user/emails", { headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Geston-Hosting" } }),
    ]);
    const profile = await profileRes.json() as any;
    const emails = await emailsRes.json() as any[];

    const primaryEmail = (emails.find((e: any) => e.primary && e.verified) || emails[0])?.email || profile.email;
    if (!primaryEmail) { res.redirect(`${CLIENT_URL}/login?error=github_no_email`); return; }

    const ip = getClientIP(req);
    let isNew = false;
    let user = await User.findOne({ githubId: String(profile.id) });

    if (!user) {
      user = await User.findOne({ email: primaryEmail });
      if (user) {
        await User.findByIdAndUpdate(user._id, { githubId: String(profile.id), avatarUrl: profile.avatar_url || "" });
      } else {
        if (intent === "login") { res.redirect(`${CLIENT_URL}/login?error=github_no_account`); return; }
        const ipCheck = await canRegisterWithIP(ip, "");
        if (!ipCheck.allowed) { res.redirect(`${CLIENT_URL}/login?error=github_server`); return; }

        await syncDefaultPackages();
        const refCode = generateReferralCode();
        let username = (profile.login || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        if (username.length < 3) username = `user${crypto.randomBytes(3).toString("hex")}`;
        const existingUsername = await User.findOne({ username });
        if (existingUsername) username = `${username}${crypto.randomBytes(2).toString("hex")}`;

        user = await User.create({
          email: primaryEmail,
          username,
          githubId: String(profile.id),
          avatarUrl: profile.avatar_url || "",
          passwordHash: "",
          txCoins: 0,
          referralCode: refCode,
          authProvider: "github",
          currency: "USD",
          currencySet: true,
        });
        isNew = true;
        await recordIPAndFingerprint(ip, user._id.toString(), "");
        await handleReferral(user._id, referralCode, ip);
      }
    }

    if (user.isBanned) { res.redirect(`${CLIENT_URL}/login?error=banned`); return; }

    const jwtToken = generateToken(user._id.toString());
    setAuthCookie(res, jwtToken);
    res.redirect(`${CLIENT_URL}/auth/github/success?token=${jwtToken}&provider=github${isNew ? "&is_new=1" : ""}`);
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.redirect(`${CLIENT_URL}/login?error=github_server`);
  }
});

export default router;
