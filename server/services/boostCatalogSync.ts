import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BoostServiceCache } from "../models/BoostServiceCache.js";
import { listProviderServices } from "./boostProvider.js";
import { detectPlatformId, detectServiceType, detectIsRegionVariant } from "../utils/boostClassify.js";

export interface CachedService {
  providerId: number;
  name: string;
  category: string;
  provider: string;
  /** TXH API base cost in KES per 1000 (before +50 margin). */
  baseKesPer1000: number;
  min: number;
  max: number;
  platformId: string;
  serviceType: string;
  isRegionVariant: boolean;
}

interface CatalogueFile {
  updatedAt: string;
  services: CachedService[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const CATALOGUE_PATH = path.join(DATA_DIR, "boost-catalogue.json");

let syncInFlight: Promise<{ count: number; updatedAt: string } | null> | null = null;
let memCache: CachedService[] | null = null;
let memCacheAt = 0;
let memCategories: string[] | null = null;
const MEM_TTL_MS = 30 * 60 * 1000;

function invalidateMemCache() {
  memCache = null;
  memCacheAt = 0;
  memCategories = null;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonCatalogue(): CatalogueFile | null {
  try {
    if (!fs.existsSync(CATALOGUE_PATH)) return null;
    const raw = fs.readFileSync(CATALOGUE_PATH, "utf8");
    const parsed = JSON.parse(raw) as CatalogueFile;
    if (!parsed || !Array.isArray(parsed.services) || parsed.services.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeJsonCatalogue(services: CachedService[]): void {
  ensureDataDir();
  const payload: CatalogueFile = {
    updatedAt: new Date().toISOString(),
    services,
  };
  const tmp = CATALOGUE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload), "utf8");
  fs.renameSync(tmp, CATALOGUE_PATH);
}

function setMem(services: CachedService[]) {
  memCache = services;
  memCacheAt = Date.now();
  memCategories = Array.from(new Set(services.map(s => s.category))).sort();
}

async function loadFromMongo(): Promise<CachedService[]> {
  try {
    return await BoostServiceCache.find({})
      .select("providerId name category provider baseKesPer1000 min max platformId serviceType isRegionVariant")
      .lean<CachedService[]>()
      .maxTimeMS(8000);
  } catch {
    return [];
  }
}

function hydrateFromDisk(): CachedService[] {
  const file = readJsonCatalogue();
  if (file?.services?.length) {
    setMem(file.services);
    return file.services;
  }
  return [];
}

export async function syncBoostCatalogue(): Promise<{ count: number; updatedAt: string } | null> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const services = await listProviderServices();
    if (!services.length) return null;

    const mapped: CachedService[] = services.map(s => {
      const base = Number(s.price_per_1000_ksh);
      return {
        providerId: s.id,
        name: s.name,
        category: s.category,
        provider: s.provider,
        // Store pure TXH API base — margin (+50) is applied only at sell time
        baseKesPer1000: Number.isFinite(base) && base >= 0 ? base : 0,
        min: s.min,
        max: s.max,
        platformId: detectPlatformId(s.name, s.category),
        serviceType: detectServiceType(s.name, s.category),
        isRegionVariant: detectIsRegionVariant(s.name, s.category),
      };
    });

    writeJsonCatalogue(mapped);
    setMem(mapped);

    try {
      const ops = mapped.map(s => ({
        updateOne: {
          filter: { providerId: s.providerId },
          update: {
            $set: {
              ...s,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));
      await BoostServiceCache.bulkWrite(ops, { ordered: false });
      const currentIds = mapped.map(s => s.providerId);
      await BoostServiceCache.deleteMany({ providerId: { $nin: currentIds } });
    } catch {}

    return { count: mapped.length, updatedAt: new Date().toISOString() };
  })()
    .finally(() => { syncInFlight = null; });
  return syncInFlight;
}

export async function ensureBoostCatalogueSynced(): Promise<void> {
  if (memCache && memCache.length > 0) return;
  const fromDisk = hydrateFromDisk();
  if (fromDisk.length > 0) return;
  const fromMongo = await loadFromMongo();
  if (fromMongo.length > 0) {
    writeJsonCatalogue(fromMongo);
    setMem(fromMongo);
    return;
  }
  await syncBoostCatalogue().catch(() => {});
}

export async function listCachedServices(q?: string, category?: string): Promise<CachedService[]> {
  if (!memCache || memCache.length === 0 || Date.now() - memCacheAt > MEM_TTL_MS) {
    const fromDisk = hydrateFromDisk();
    if (fromDisk.length === 0) {
      const fromMongo = await loadFromMongo();
      if (fromMongo.length > 0) {
        writeJsonCatalogue(fromMongo);
        setMem(fromMongo);
      } else {
        await syncBoostCatalogue().catch(() => {});
      }
    }
  }

  if (!memCache || memCache.length === 0) {
    return [];
  }

  let result = memCache;
  if (category) {
    result = result.filter(s => s.category === category);
  }
  if (q) {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    result = result.filter(s => {
      const hay = `${s.name} ${s.category}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }
  return result;
}

export async function getCachedServiceById(providerId: number): Promise<CachedService | null> {
  if (!memCache || memCache.length === 0) {
    hydrateFromDisk();
  }
  if (memCache) {
    const hit = memCache.find(s => s.providerId === providerId);
    if (hit) return hit;
  }
  try {
    return await BoostServiceCache.findOne({ providerId }).lean<CachedService>();
  } catch {
    return null;
  }
}

export async function listCachedCategories(): Promise<string[]> {
  if (memCategories && memCategories.length) return memCategories;
  if (!memCache || memCache.length === 0) hydrateFromDisk();
  if (memCategories) return memCategories;
  try {
    const cats = await BoostServiceCache.distinct("category");
    memCategories = cats.sort();
    return memCategories;
  } catch {
    return [];
  }
}

export function warmBoostMemCache(): void {
  const fromDisk = hydrateFromDisk();
  if (fromDisk.length > 0) return;
  loadFromMongo()
    .then(all => {
      if (all.length > 0) {
        writeJsonCatalogue(all);
        setMem(all);
      } else {
        syncBoostCatalogue().catch(() => {});
      }
    })
    .catch(() => {
      syncBoostCatalogue().catch(() => {});
    });
}

export function getCatalogueMeta(): { count: number; updatedAt: string | null; source: string } {
  if (memCache && memCache.length > 0) {
    const file = readJsonCatalogue();
    return { count: memCache.length, updatedAt: file?.updatedAt || null, source: "memory" };
  }
  const file = readJsonCatalogue();
  if (file?.services?.length) {
    return { count: file.services.length, updatedAt: file.updatedAt, source: "json" };
  }
  return { count: 0, updatedAt: null, source: "empty" };
}

export async function clearBoostCatalogue(): Promise<void> {
  invalidateMemCache();
  try {
    if (fs.existsSync(CATALOGUE_PATH)) fs.unlinkSync(CATALOGUE_PATH);
  } catch {}
  try {
    await BoostServiceCache.deleteMany({});
  } catch {}
}
