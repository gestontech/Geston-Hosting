import { BoostServiceCache } from "../models/BoostServiceCache.js";
import { isServiceDisabled } from "../lib/featureFlags.js";
import { getBoostShopUrl, getSiteUrl } from "../lib/siteUrl.js";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X (Twitter)",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  twitch: "Twitch",
  pinterest: "Pinterest",
  discord: "Discord",
  threads: "Threads",
  other: "Other",
};

const PLATFORM_ORDER = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "x",
  "telegram",
  "whatsapp",
  "spotify",
  "soundcloud",
  "linkedin",
  "snapchat",
  "twitch",
  "pinterest",
  "discord",
  "threads",
  "other",
];

/** Preferred order for service-type buttons when present. */
const TYPE_ORDER = [
  "followers",
  "likes",
  "views",
  "comments",
  "shares",
  "saves",
  "subscribers",
  "members",
  "watch time",
  "live viewers",
  "reactions",
  "votes",
  "plays",
  "other",
];

export type BoostPlatform = { id: string; label: string; count: number };
export type BoostServiceType = { id: string; label: string; count: number };
export type BoostServiceRow = {
  providerId: number;
  name: string;
  platformId: string;
  serviceType: string;
  baseKesPer1000: number;
  min: number;
  max: number;
};

export function platformLabel(id: string): string {
  return PLATFORM_LABELS[id] || id;
}

export function boostPlatformCb(id: string): string {
  return "boost_plat_" + id;
}

export function boostServiceCb(providerId: number): string {
  return "boost_svc_" + String(providerId);
}

/** Encode service type into a compact callback id (max ~40 chars for WA buttons). */
export function boostTypeCb(platformId: string, typeId: string): string {
  return "boost_type_" + platformId + "_" + slugifyType(typeId);
}

export function parseBoostPlatformCb(raw: string): string | null {
  const m = String(raw || "").match(/^boost_plat_([a-z0-9_]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

export function parseBoostServiceCb(raw: string): number | null {
  const m = String(raw || "").match(/^boost_svc_(\d+)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function parseBoostTypeCb(raw: string): { platformId: string; typeSlug: string } | null {
  const m = String(raw || "").match(/^boost_type_([a-z0-9]+)_([a-z0-9_]+)$/i);
  if (!m) return null;
  return { platformId: m[1].toLowerCase(), typeSlug: m[2].toLowerCase() };
}

export function slugifyType(type: string): string {
  return String(type || "other")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "other";
}

export function shortServiceButtonLabel(name: string, maxLen = 28): string {
  const t = String(name || "").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + "…";
}

export async function listBoostPlatforms(): Promise<BoostPlatform[]> {
  if (await isServiceDisabled("boost")) return [];
  const rows = await BoostServiceCache.aggregate<{ _id: string; count: number }>([
    { $match: { isRegionVariant: false } },
    { $group: { _id: { $ifNull: ["$platformId", "other"] }, count: { $sum: 1 } } },
  ]);
  const byId = new Map(rows.map((r) => [String(r._id || "other").toLowerCase(), r.count]));
  const ordered: BoostPlatform[] = [];
  for (const id of PLATFORM_ORDER) {
    const count = byId.get(id);
    if (count && count > 0) {
      ordered.push({ id, label: platformLabel(id), count });
      byId.delete(id);
    }
  }
  for (const [id, count] of byId) {
    if (count > 0) ordered.push({ id, label: platformLabel(id), count });
  }
  return ordered;
}

/** Distinct service types for a platform (followers, likes, …). */
export async function listBoostServiceTypes(platformId: string): Promise<BoostServiceType[]> {
  const pid = String(platformId || "").toLowerCase();
  const rows = await BoostServiceCache.aggregate<{ _id: string; count: number }>([
    { $match: { platformId: pid, isRegionVariant: false } },
    {
      $group: {
        _id: {
          $ifNull: [
            {
              $cond: [
                { $or: [{ $eq: ["$serviceType", ""] }, { $eq: ["$serviceType", null] }] },
                "Other",
                "$serviceType",
              ],
            },
            "Other",
          ],
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const items = rows
    .map((r) => {
      const label = String(r._id || "Other").trim() || "Other";
      return {
        id: slugifyType(label),
        label,
        count: r.count,
      };
    })
    .filter((t) => t.count > 0);

  items.sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.id.replace(/_/g, " "));
    const bi = TYPE_ORDER.indexOf(b.id.replace(/_/g, " "));
    const ao = ai === -1 ? 999 : ai;
    const bo = bi === -1 ? 999 : bi;
    if (ao !== bo) return ao - bo;
    // also try matching raw labels
    const al = TYPE_ORDER.indexOf(a.label.toLowerCase());
    const bl = TYPE_ORDER.indexOf(b.label.toLowerCase());
    const alo = al === -1 ? 999 : al;
    const blo = bl === -1 ? 999 : bl;
    if (alo !== blo) return alo - blo;
    return a.label.localeCompare(b.label);
  });

  return items;
}

/** Services for platform + type, cheapest first. */
export async function listBoostServicesForType(
  platformId: string,
  typeSlug: string,
  limit = 12
): Promise<BoostServiceRow[]> {
  const pid = String(platformId || "").toLowerCase();
  const slug = slugifyType(typeSlug);

  const all = await BoostServiceCache.find({
    platformId: pid,
    isRegionVariant: false,
  })
    .sort({ baseKesPer1000: 1, name: 1 })
    .lean();

  const filtered = all.filter((s) => {
    const t = String(s.serviceType || "Other").trim() || "Other";
    return slugifyType(t) === slug;
  });

  return filtered.slice(0, limit).map((s) => ({
    providerId: s.providerId,
    name: s.name,
    platformId: s.platformId || pid,
    serviceType: s.serviceType || "Other",
    baseKesPer1000: s.baseKesPer1000,
    min: s.min,
    max: s.max,
  }));
}

/** @deprecated Prefer listBoostServiceTypes → listBoostServicesForType */
export async function listBoostServicesForPlatform(
  platformId: string,
  limit = 20
): Promise<BoostServiceRow[]> {
  const pid = String(platformId || "").toLowerCase();
  const services = await BoostServiceCache.find({
    platformId: pid,
    isRegionVariant: false,
  })
    .sort({ baseKesPer1000: 1, name: 1 })
    .limit(limit)
    .lean();
  return services.map((s) => ({
    providerId: s.providerId,
    name: s.name,
    platformId: s.platformId || pid,
    serviceType: s.serviceType || "Other",
    baseKesPer1000: s.baseKesPer1000,
    min: s.min,
    max: s.max,
  }));
}

export async function getBoostServiceByProviderId(
  providerId: number
): Promise<BoostServiceRow | null> {
  const s = await BoostServiceCache.findOne({ providerId }).lean();
  if (!s) return null;
  return {
    providerId: s.providerId,
    name: s.name,
    platformId: s.platformId || "other",
    serviceType: s.serviceType || "Other",
    baseKesPer1000: s.baseKesPer1000,
    min: s.min,
    max: s.max,
  };
}

export function formatBoostServiceDetail(s: BoostServiceRow): string {
  const shop = getBoostShopUrl();
  return (
    platformLabel(s.platformId) +
    " — " +
    s.name +
    "\n\n" +
    "Type: " +
    s.serviceType +
    "\n" +
    "Price: " +
    String(s.baseKesPer1000) +
    " KSH / 1000\n" +
    "Min: " +
    String(s.min) +
    " · Max: " +
    String(s.max) +
    "\n\n" +
    "Order on the website:\n" +
    shop
  );
}

export async function buildBoostPlatformIntro(): Promise<string> {
  if (await isServiceDisabled("boost")) {
    return "Social media boosting is temporarily disabled.\n\nShop: " + getSiteUrl();
  }
  const platforms = await listBoostPlatforms();
  if (platforms.length === 0) {
    return "No boost services available right now.\n\nOrder on the website:\n" + getBoostShopUrl();
  }
  return (
    "📈 Social Boosting\n\n" +
    "Pick a platform:" +
    "\n\nFull catalog: " +
    getBoostShopUrl()
  );
}

export async function buildBoostText(): Promise<string> {
  return buildBoostPlatformIntro();
}
