import { API_URL, fetchWithAuth } from "./apiClient";

const BOOST_CACHE_TTL_MS = 5 * 60 * 1000;

interface BoostServiceApi {
  id: number;
  name: string;
  category: string;
  pricePer1000: number;
  pricePer1000Kes: number;
  currency: string;
  min: number;
  max: number;
  platformId: string;
  serviceType: string;
  isRegionVariant: boolean;
}

interface BoostServicesResponse {
  services: BoostServiceApi[];
  currency?: string;
  error?: string;
}

interface LocalCacheEntry<T> {
  data: T;
  fetchedAt: number;
}

function readLocalCache<T>(key: string): LocalCacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCacheEntry<T>;
    if (typeof parsed?.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalCache<T>(key: string, entry: LocalCacheEntry<T>) {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

const boostServicesCache = new Map<string, { data: BoostServicesResponse; fetchedAt: number }>();
let boostCategoriesCache: { data: unknown; fetchedAt: number } | null = null;

export async function getBoostServices(params: {
  q?: string;
  category?: string;
  currency?: string;
}): Promise<BoostServicesResponse> {
  const currency = params.currency || "";
  const cacheKey = currency;
  const localKey = `boost_services_${currency || "default"}`;
  const cached = boostServicesCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < BOOST_CACHE_TTL_MS) {
    // Never serve a cached error payload
    if (Array.isArray(cached.data.services)) return cached.data;
  }
  const local = readLocalCache<BoostServicesResponse>(localKey);
  if (local && Date.now() - local.fetchedAt < BOOST_CACHE_TTL_MS && Array.isArray(local.data.services)) {
    boostServicesCache.set(cacheKey, { data: local.data, fetchedAt: local.fetchedAt });
    return local.data;
  }
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.currency) sp.set("currency", params.currency);
  const qs = sp.toString();
  const res = await fetch(`${API_URL}/boost/services${qs ? `?${qs}` : ""}`);
  const data = (await res.json().catch(() => ({}))) as BoostServicesResponse;
  if (!res.ok || !Array.isArray(data.services)) {
    // Do not cache failures / auth errors
    return {
      services: [],
      error: data.error || `Failed to load services (${res.status})`,
    };
  }
  boostServicesCache.set(cacheKey, { data, fetchedAt: Date.now() });
  writeLocalCache(localKey, { data, fetchedAt: Date.now() });
  return data;
}

export async function getBoostCategories() {
  if (boostCategoriesCache && Date.now() - boostCategoriesCache.fetchedAt < BOOST_CACHE_TTL_MS) {
    return boostCategoriesCache.data;
  }
  const res = await fetch(`${API_URL}/boost/categories`);
  if (!res.ok) return [];
  const data = await res.json();
  boostCategoriesCache = { data, fetchedAt: Date.now() };
  return data;
}

export async function placeBoostOrder(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getBoostOrders() {
  const res = await fetchWithAuth("/boost/orders");
  return res.json();
}

export async function refreshBoostOrder(id: string) {
  const res = await fetchWithAuth(`/boost/orders/${id}/refresh`, { method: "POST" });
  return res.json();
}

export async function prepareBoostOrder(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/prepare", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function payBoostMpesa(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/pay/mpesa", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getBoostMpesaStatus(reference: string) {
  const res = await fetchWithAuth(`/boost/pay/mpesa/status/${reference}`);
  return res.json();
}

export async function payBoostDRC(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/pay/drc", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getBoostDRCStatus(reference: string) {
  const res = await fetchWithAuth(`/boost/pay/drc/status/${reference}`);
  return res.json();
}

export async function payBoostCameroon(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/pay/cameroon", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getBoostCameroonStatus(reference: string) {
  const res = await fetchWithAuth(`/boost/pay/cameroon/status/${reference}`);
  return res.json();
}

export async function payBoostTanzania(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/pay/tanzania", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getBoostTanzaniaStatus(reference: string) {
  const res = await fetchWithAuth(`/boost/pay/tanzania/status/${reference}`);
  return res.json();
}

export async function payBoostCardPrepare(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/pay/card/prepare", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function payBoostCardInit(data: Record<string, unknown>) {
  const res = await fetchWithAuth("/boost/pay/card/init", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function verifyBoostCard(reference: string) {
  const res = await fetchWithAuth(`/boost/pay/card/verify/${reference}`);
  return res.json();
}

/** Status lives on GET /api/apikeys (not /apikeys/status). */
export async function getApiKeyStatus() {
  const res = await fetchWithAuth("/apikeys");
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const msg =
      (body as { error?: string }).error ||
      (res.status === 401 ? "Please sign in again" : `API key status failed (${res.status})`);
    throw new Error(msg);
  }
  return {
    hasKey: !!(body as { hasKey?: boolean }).hasKey,
    maskedKey: String((body as { maskedKey?: string }).maskedKey || ""),
    active: !!(body as { active?: boolean }).active,
    createdAt: (body as { createdAt?: string | null }).createdAt ?? null,
    lastUsedAt: (body as { lastUsedAt?: string | null }).lastUsedAt ?? null,
    callCount: Number((body as { callCount?: number }).callCount || 0),
  };
}

export async function generateApiKey() {
  const res = await fetchWithAuth("/apikeys/generate", { method: "POST" });
  return res.json();
}

export async function pauseApiKey() {
  const res = await fetchWithAuth("/apikeys/pause", { method: "POST" });
  return res.json();
}

export async function resumeApiKey() {
  const res = await fetchWithAuth("/apikeys/resume", { method: "POST" });
  return res.json();
}

export async function deleteApiKey() {
  const res = await fetchWithAuth("/apikeys", { method: "DELETE" });
  return res.json();
}

export async function revealApiKey() {
  const res = await fetchWithAuth("/apikeys/reveal");
  return res.json();
}
