import { Router } from "express";
import mongoose from "mongoose";
import { BlockedTrial } from "../../models/BlockedTrial.js";
import { BoostOrder } from "../../models/BoostOrder.js";
import { BoostServiceCache } from "../../models/BoostServiceCache.js";
import { User } from "../../models/User.js";
import { clearBoostCatalogue } from "../../services/boostCatalogSync.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

/** Known collections with friendly labels. Everything is purgeable (with UI confirmation). */
const KNOWN_COLLECTIONS: Array<{ key: string; label: string }> = [
  { key: "users", label: "Users" },
  { key: "bots", label: "Bots" },
  { key: "panels", label: "Panels" },
  { key: "panelplans", label: "Panel Plans" },
  { key: "transactions", label: "Transactions" },
  { key: "blockedtrials", label: "Blocked Trials" },
  { key: "iprecords", label: "IP Records" },
  { key: "trialchecks", label: "Trial Checks" },
  { key: "coupons", label: "Coupons" },
  { key: "referrals", label: "Referrals" },
  { key: "boostservicecaches", label: "Boost Catalogue" },
  { key: "boostorders", label: "Boost Orders" },
  { key: "bottemplates", label: "Bot Templates" },
  { key: "tutorials", label: "Tutorials" },
  { key: "notifications", label: "Notifications" },
  { key: "broadcastnotifications", label: "Broadcasts" },
  { key: "bugreports", label: "Bug Reports" },
  { key: "wacontacts", label: "WA Contacts" },
  { key: "waownersessions", label: "WA Owner Sessions" },
  { key: "packages", label: "Packages" },
  { key: "teams", label: "Teams" },
  { key: "emailquotas", label: "Email Quotas" },
  { key: "appsettings", label: "App Settings" },
  // Virtual: API keys live on User documents, not a separate collection
  { key: "developer_api_keys", label: "Developer API Keys" },
];

const LABEL_BY_KEY = new Map(KNOWN_COLLECTIONS.map((c) => [c.key, c.label]));

function humanizeCollection(name: string): string {
  return (
    LABEL_BY_KEY.get(name) ||
    name
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

async function countDeveloperApiKeys(): Promise<number> {
  return User.countDocuments({
    $or: [
      { apiKeyHash: { $exists: true, $ne: "" } },
      { apiKeyActive: true },
      { apiKeyEncrypted: { $exists: true, $ne: "" } },
    ],
  }).maxTimeMS(5000);
}

async function purgeDeveloperApiKeys(): Promise<number> {
  const result = await User.updateMany(
    {
      $or: [
        { apiKeyHash: { $exists: true, $ne: "" } },
        { apiKeyActive: true },
        { apiKeyEncrypted: { $exists: true, $ne: "" } },
        { apiKeyPrefix: { $exists: true, $ne: "" } },
      ],
    },
    {
      $set: {
        apiKeyHash: "",
        apiKeyEncrypted: "",
        apiKeyPrefix: "",
        apiKeyActive: false,
        apiCallCount: 0,
      },
      $unset: { apiKeyCreatedAt: "", apiKeyLastUsedAt: "" },
    }
  );
  return result.modifiedCount || 0;
}

router.get("/db/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = mongoose.connection.db;
    let storageInfo: { dataSize: number; storageSize: number; totalSize: number } | null = null;
    try {
      const stats = await db!.command({ dbStats: 1, scale: 1 });
      storageInfo = {
        dataSize: stats.dataSize as number,
        storageSize: stats.storageSize as number,
        totalSize: (stats.dataSize as number) + (stats.indexSize as number),
      };
    } catch {}

    const live = await db!.listCollections().toArray();
    const liveNames = live.map((c) => String(c.name)).filter((n) => !n.startsWith("system."));
    const allKeys = Array.from(
      new Set([...KNOWN_COLLECTIONS.map((c) => c.key), ...liveNames])
    ).sort();

    const counts = await Promise.all(
      allKeys.map(async (key) => {
        try {
          let count = 0;
          if (key === "developer_api_keys") {
            count = await countDeveloperApiKeys();
          } else if (key === "boostservicecaches") {
            count = await BoostServiceCache.countDocuments().maxTimeMS(5000);
          } else if (key === "boostorders") {
            count = await BoostOrder.countDocuments().maxTimeMS(5000);
          } else {
            count = await db!.collection(key).countDocuments({}, { maxTimeMS: 5000 });
          }
          return { name: key, label: humanizeCollection(key), count, canPurge: true };
        } catch {
          return { name: key, label: humanizeCollection(key), count: 0, canPurge: true };
        }
      })
    );

    const quotaMb = Number(process.env.MONGO_STORAGE_QUOTA_MB || "512");
    let quota: { quotaMb: number; usedMb: number; remainingMb: number; usedPercent: number } | null =
      null;
    if (storageInfo) {
      const usedMb = storageInfo.storageSize / (1024 * 1024);
      const remainingMb = Math.max(0, quotaMb - usedMb);
      const usedPercent = Math.min(100, (usedMb / quotaMb) * 100);
      quota = { quotaMb, usedMb, remainingMb, usedPercent };
    }
    res.json({ collections: counts, storage: storageInfo, quota });
  } catch (err) {
    next(err);
  }
});

router.delete("/db/purge/:collection", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const col = String(req.params.collection || "").toLowerCase();
    if (!col || col.startsWith("system.")) {
      res.status(403).json({ error: "Cannot purge this collection" });
      return;
    }
    const db = mongoose.connection.db;

    if (col === "developer_api_keys") {
      const cleared = await purgeDeveloperApiKeys();
      res.json({ ok: true, cleared });
      return;
    }

    const live = await db!.listCollections({ name: col }).toArray();
    const isKnown = LABEL_BY_KEY.has(col);
    if (live.length === 0 && !isKnown) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    if (col === "boostservicecaches") {
      await clearBoostCatalogue();
    } else if (col === "boostorders") {
      await BoostOrder.deleteMany({});
    } else {
      await db!.collection(col).deleteMany({});
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/blocked-trials", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const blocked = await BlockedTrial.find({}).sort({ _id: -1 }).lean();
    res.json({ blocked });
  } catch (err) {
    next(err);
  }
});

router.delete("/blocked-trials/:phone", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await BlockedTrial.deleteOne({ phoneNumber: req.params.phone });
    res.json({ ok: true, deleted: result.deletedCount || 0 });
  } catch (err) {
    next(err);
  }
});

router.get("/maintenance", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { getSetting } = await import("../../models/AppSettings.js");
    const maintenanceMode = await getSetting("maintenanceMode", false);
    res.json({ maintenanceMode: !!maintenanceMode });
  } catch (err) {
    next(err);
  }
});

router.post("/maintenance", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enabled } = req.body ?? {};
    const { setSetting } = await import("../../models/AppSettings.js");
    await setSetting("maintenanceMode", !!enabled);
    res.json({ ok: true, maintenanceMode: !!enabled });
  } catch (err) {
    next(err);
  }
});

router.get("/settings/heroku-key", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { getSetting } = await import("../../models/AppSettings.js");
    const key = (await getSetting("herokuApiKey", "")) as string;
    const fromEnv = !!(process.env.HEROKU_API_KEY || "").trim();
    const hasKey = !!(key && key.trim()) || fromEnv;
    const masked =
      key && key.trim()
        ? `${key.trim().slice(0, 6)}…${key.trim().slice(-4)}`
        : fromEnv
          ? "(from environment variable)"
          : "";
    res.json({
      hasKey,
      masked,
      source: key && key.trim() ? "database" : fromEnv ? "env" : "none",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/settings/heroku-key", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.body ?? {};
    const { setSetting } = await import("../../models/AppSettings.js");
    if (key === null || key === "") {
      await setSetting("herokuApiKey", "");
      res.json({ ok: true, cleared: true });
      return;
    }
    if (typeof key !== "string" || key.trim().length < 20) {
      res.status(400).json({ error: "Invalid API key" });
      return;
    }
    await setSetting("herokuApiKey", key.trim());
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
