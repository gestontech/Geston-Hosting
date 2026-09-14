import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";
import botRouter from "./routes/bots.js";
import paymentsRouter, { paystackWebhookHandler, speedpesaWebhookHandler, wonyaWebhookHandler } from "./routes/payments.js";
import panelsRouter from "./routes/panels.js";
import adminRouter from "./routes/admin.js";
import couponRouter from "./routes/coupons.js";
import botTemplatesRouter from "./routes/bot-templates.js";
import tutorialsRouter from "./routes/tutorials.js";
import notificationsRouter from "./routes/notifications.js";
import currencyRouter from "./routes/currency.js";
import boostRouter from "./routes/boost.js";
import apiKeysRouter from "./routes/apikeys.js";
import publicApiRouter from "./routes/publicApi.js";
import aiChatRouter from "./routes/aiChat.js";
import bugReportsRouter from "./routes/bugReports.js";
import statusRouter from "./routes/status.js";
import { publicApiRateLimit } from "./middleware/rateLimit.js";
import { logger } from "./logger.js";
import { BotTemplate } from "./models/BotTemplate.js";
import { Bot } from "./models/Bot.js";
import { PanelPlan } from "./models/PanelPlan.js";
import { startBot } from "./services/bot.js";
import { startCronJobs } from "./services/cron.js";
import { ensureBoostCatalogueSynced, warmBoostMemCache } from "./services/boostCatalogSync.js";
import { errorHandler } from "./lib/errors.js";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";
const ALLOWED_ORIGINS = FRONTEND_ORIGIN.split(",").map(o => o.trim()).filter(Boolean);
if (ALLOWED_ORIGINS.length === 0) logger.warn("FRONTEND_ORIGIN is not set — cross-origin requests will be rejected. Set FRONTEND_ORIGIN to your site's URL(s), comma-separated.");
const JWT_SECRET = process.env.JWT_SECRET || "";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

const DEFAULT_BOT_IMAGE =
  "https://hosting.gestontech.online/logo/icon.png";

function fallbackPublicHost(): string {
  const raw = process.env.APP_URL || process.env.CLIENT_URL || process.env.SITE_URL || "";
  if (!raw) return "localhost";
  try {
    return new URL(raw).host;
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0] || "localhost";
  }
}

if (!JWT_SECRET) {
  logger.error("JWT_SECRET is not set. Refusing to start — running with an empty JWT secret lets anyone forge login tokens.");
  process.exit(1);
}
if (!ADMIN_EMAIL) {
  logger.error("ADMIN_EMAIL is not set. Refusing to start.");
  process.exit(1);
}
if (!MONGODB_URI) {
  logger.error("MONGODB_URI is not set. Refusing to start.");
  process.exit(1);
}

let _maintenanceCached: { on: boolean; ts: number } = { on: false, ts: 0 };
const MAINTENANCE_CACHE_TTL = 30_000;
async function getMaintenanceCached(): Promise<boolean> {
  const now = Date.now();
  if (now - _maintenanceCached.ts < MAINTENANCE_CACHE_TTL) return _maintenanceCached.on;
  try {
    const { getSetting } = await import("./models/AppSettings.js");
    const val = await getSetting("maintenanceMode", false);
    _maintenanceCached = { on: !!val, ts: now };
    return _maintenanceCached.on;
  } catch { return _maintenanceCached.on; }
}

app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { originHost = ""; }
    const allowed = originHost === req.headers.host || ALLOWED_ORIGINS.includes(origin);
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "Content-Type,Authorization,x-api-key");
    res.sendStatus(204);
    return;
  }
  next();
});

app.post("/webhook", paystackWebhookHandler);
app.post("/webhook/speedpesa", speedpesaWebhookHandler);
app.post("/webhook/wonyapay", wonyaWebhookHandler);

app.use("/api/auth", authRouter);

// Public status / ping — always available (even during maintenance)
app.use("/api/status", statusRouter);
app.use("/api/ping", statusRouter);

app.use(async (req: any, res: any, next: any) => {
  if (!req.path.startsWith("/api/")) return next();
  if (
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/api/settings/") ||
    req.path.startsWith("/api/status") ||
    req.path.startsWith("/api/ping") ||
    req.path === "/api/health" ||
    req.path === "/webhook"
  ) return next();

  const maintenanceOn = await getMaintenanceCached();
  if (!maintenanceOn) return next();

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "") ||
                  (req.cookies?.token || "");
    if (token && JWT_SECRET) {
      const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
      if (decoded.userId) {
        const { User } = await import("./models/User.js");
        const u = await (User as any).findById(decoded.userId).lean() as { email?: string; isModerator?: boolean } | null;
        if (u && ((u.email || "").toLowerCase() === ADMIN_EMAIL || u.isModerator === true)) return next();
      }
    }
  } catch {}

  return res.status(503).json({ error: "Site is under maintenance. Please try again later.", maintenanceMode: true });
});

app.use("/api/bots", botRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/panels", panelsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/ai/chat", aiChatRouter);
app.use("/api/bug-reports", bugReportsRouter);

app.get("/api/settings/maintenance", async (_req, res) => {
  try {
    const { getSetting } = await import("./models/AppSettings.js");
    const maintenanceMode = await getSetting("maintenanceMode", false);
    res.json({ maintenanceMode: !!maintenanceMode });
  } catch { res.json({ maintenanceMode: false }); }
});

app.get("/api/settings/feature-flags", async (_req, res) => {
  try {
    const { getDisabledServices, getDisabledPaymentMethods } = await import("./lib/featureFlags.js");
    const [disabledServices, disabledPaymentMethods] = await Promise.all([
      getDisabledServices(),
      getDisabledPaymentMethods(),
    ]);
    res.json({ disabledServices, disabledPaymentMethods });
  } catch {
    res.json({ disabledServices: [], disabledPaymentMethods: [] });
  }
});

app.use("/api/bot-templates", botTemplatesRouter);
app.use("/api/tutorials", tutorialsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/currency", currencyRouter);
app.use("/api/boost", boostRouter);
app.use("/api/apikeys", apiKeysRouter);
app.use("/api/v1/bots", publicApiRateLimit, botRouter);
app.use("/api/v1/bot-templates", publicApiRateLimit, botTemplatesRouter);
app.use("/api/v1/boost", publicApiRateLimit, boostRouter);
app.use("/api/v1", publicApiRateLimit, publicApiRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const CRAWLER_RE = /whatsapp|facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|discord|googlebot|bingbot|curl|wget|python-requests/i;

app.get(["/services/bots/:slug", "/services/bots/:slug/*"], async (req, res, next) => {
  const ua = req.headers["user-agent"] || "";
  if (!CRAWLER_RE.test(ua)) { next(); return; }
  try {
    const template = await BotTemplate.findOne({ shareableSlug: req.params.slug, active: true }).lean();
    if (!template) { next(); return; }
    const name = (template as unknown as { name?: string }).name || "Geston Bot";
    const imageUrl =
      (template as unknown as { imageUrl?: string }).imageUrl || DEFAULT_BOT_IMAGE;
    const host = req.get("host") || fallbackPublicHost();
    const proto = req.protocol || "https";
    const url = `${proto}://${host}/services/bots/${req.params.slug}`;
    const title = `${name} — Deploy on Geston Host`;
    const desc = `Deploy ${name} bot instantly on Geston Host. Fast, reliable WhatsApp bot hosting in seconds.`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<meta name="description" content="${desc}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image" content="${imageUrl}"/>
<meta property="og:image:width" content="512"/>
<meta property="og:image:height" content="512"/>
<meta property="og:url" content="${url}"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
<meta name="twitter:image" content="${imageUrl}"/>
</head><body><p>${title}</p><script>window.location.replace("${url}");</script></body></html>`);
  } catch { next(); }
});

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));
app.get(/.*/, (_req, res) => { res.sendFile(path.join(distPath, "index.html")); });

app.use(errorHandler);

async function dropStaleIndexes() {
  const db = mongoose.connection.db;
  if (!db) return;
  try {
    const indexes = await db.collection("panels").indexes();
    if (indexes.some((idx: { name?: string }) => idx.name === "paystackRef_1")) {
      await db.collection("panels").dropIndex("paystackRef_1");
      logger.info("Dropped stale paystackRef_1 index from panels collection");
    }
  } catch (err) {
    logger.warn({ err }, "Could not check/drop paystackRef_1 index (safe to ignore)");
  }
}

async function seedDefaultTemplate() {
  try {
    const count = await BotTemplate.countDocuments({ isDefault: true });
    if (count > 0) return;
    await BotTemplate.create({
      name: "Geston-MD",
      githubRepo: "https://github.com/gestontech/Geston-MD",
      sessionIdUrl: process.env.PAIRING_URL || "",
      imageUrl: DEFAULT_BOT_IMAGE,
      costTx: 0,
      isDefault: true,
      active: true,
      shareableSlug: "geston-md"
    });
    logger.info("Seeded default Geston-MD bot template");
  } catch (err) {
    logger.error({ err }, "Failed to seed default template");
  }
}

async function fixDefaultBotTemplate() {
  try {
    const result = await BotTemplate.updateMany(
      { isDefault: true },
      {
        $set: {
          name: "Geston-MD",
          githubRepo: "https://github.com/gestontech/Geston-MD",
          imageUrl: DEFAULT_BOT_IMAGE,
        },
      }
    );
    if (result.modifiedCount > 0) logger.info(`Corrected ${result.modifiedCount} default bot template(s) to point at Geston-MD`);
  } catch (err) {
    logger.warn({ err }, "Default bot template fix failed (safe to ignore)");
  }
}

async function seedPanelPlans() {
  try {
    const count = await PanelPlan.countDocuments();
    if (count > 0) return;
    await PanelPlan.insertMany([
      {
        name: "Mini 400MB",
        description: "400MB RAM · ~4GB Disk · 1 Allocation · 1 Database",
        txCost: 5,
        originalTxCost: 8,
        ram: "400 MB",
        disk: "~4 GB",
        cpu: "100%",
        isBestDeal: false,
        active: true,
        order: 0
      },
      {
        name: "Basic 800MB",
        description: "800MB RAM · ~8GB Disk · 2 Allocations · 2 Databases",
        txCost: 10,
        originalTxCost: 16,
        ram: "800 MB",
        disk: "~8 GB",
        cpu: "100%",
        isBestDeal: false,
        active: true,
        order: 1
      },
      {
        name: "Unlimited",
        description: "Unlimited RAM · Unlimited Disk · 100 Allocations · 10 Databases",
        txCost: 12,
        originalTxCost: 20,
        ram: "∞ Unlimited",
        disk: "∞ Unlimited",
        cpu: "100%",
        isBestDeal: true,
        active: true,
        order: 2
      }
    ]);
    logger.info("Seeded default panel plans");
  } catch (err) {
    logger.error({ err }, "Failed to seed panel plans");
  }
}

async function deduplicatePanelPlans() {
  try {
    const plans = await PanelPlan.find({}).lean();
    const groups: Record<string, typeof plans> = {};
    for (const p of plans) {
      const key = ((p as unknown as { name?: string }).name || "").toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    let removed = 0;
    for (const group of Object.values(groups)) {
      if (group.length <= 1) continue;
      const activeOnes = group.filter(p => (p as unknown as { active?: boolean }).active);
      const keep = activeOnes.length === 1 ? activeOnes[0] : group.sort((a, b) => a._id.toString().localeCompare(b._id.toString()))[0];
      for (const p of group) {
        if (p._id.toString() !== keep._id.toString()) {
          await PanelPlan.findByIdAndDelete(p._id);
          removed++;
        }
      }
    }
    if (removed > 0) logger.info(`Removed ${removed} duplicate PanelPlan documents`);
  } catch (err) {
    logger.warn({ err }, "PanelPlan deduplication failed (safe to ignore)");
  }
}

async function cleanupOrphanedBots() {
  try {
    const bots = await Bot.find({}).lean();
    const { User: UserModel } = await import("./models/User.js");
    const userIds = [...new Set(bots.map(b => (b as unknown as { userId?: { toString(): string } }).userId?.toString()).filter(Boolean))] as string[];
    const existingUsers = await UserModel.find({ _id: { $in: userIds } }).select("_id").lean();
    const existingSet = new Set(existingUsers.map(u => u._id.toString()));
    const orphans = bots.filter(b => {
      const uid = (b as unknown as { userId?: { toString(): string } }).userId?.toString();
      return uid && !existingSet.has(uid);
    });
    if (orphans.length > 0) {
      await Bot.deleteMany({ _id: { $in: orphans.map(b => b._id) } });
      logger.info(`Removed ${orphans.length} orphaned bot documents`);
    }
  } catch (err) {
    logger.warn({ err }, "Orphaned bot cleanup failed (safe to ignore)");
  }
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    logger.info("MongoDB connected");
    await dropStaleIndexes();
    await deduplicatePanelPlans();
    await cleanupOrphanedBots();
    await fixDefaultBotTemplate();
    await seedDefaultTemplate();
    await seedPanelPlans();
    startCronJobs();
    ensureBoostCatalogueSynced().then(() => warmBoostMemCache()).catch(() => {});
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
    startBot();
  })
  .catch(err => {
    logger.error({ err }, "MongoDB connection failed");
    process.exit(1);
  });
