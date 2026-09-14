function getBaseUrl(): string {
  const url = process.env.TXH_API_URL || "";
  if (!url) throw new Error("Social boosting is temporarily unavailable");
  return url.replace(/\/$/, "");
}

function getApiKey(): string {
  const key = process.env.TXH_API || "";
  if (!key) throw new Error("Social boosting is temporarily unavailable");
  return key;
}

async function callProvider<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getApiKey()}`,
      ...(options.headers as Record<string, string> || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.success === false) {
    const message = (data && (data.error?.message || data.error)) || `Provider request failed (${res.status})`;
    const err = new Error(typeof message === "string" ? message : "Provider request failed");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export interface ProviderService {
  id: number;
  name: string;
  category: string;
  provider: string;
  /** Base cost from the TXH API in KES per 1000 units (before our +50 margin). */
  price_per_1000_ksh: number;
  min: number;
  max: number;
}

/** Coerce whatever price field the TXH API returns into a finite KES-per-1000 number. */
function extractBaseKesPer1000(raw: Record<string, unknown>): number {
  const candidates = [
    raw.price_per_1000_ksh,
    raw.price_per_1000,
    raw.rate,
    raw.price,
    raw.cost,
    raw.rate_per_1000,
  ];
  for (const c of candidates) {
    const n = typeof c === "string" ? parseFloat(c) : Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function normalizeProviderService(raw: Record<string, unknown>): ProviderService | null {
  const id = Number(raw.id ?? raw.service_id);
  if (!Number.isFinite(id)) return null;
  const name = String(raw.name || raw.service || "").trim();
  if (!name) return null;
  return {
    id,
    name,
    category: String(raw.category || ""),
    provider: String(raw.provider || ""),
    price_per_1000_ksh: extractBaseKesPer1000(raw),
    min: Math.max(1, Number(raw.min) || 1),
    max: Math.max(1, Number(raw.max) || 100000),
  };
}

const CATALOGUE_TTL_MS = 10 * 60 * 1000;
let catalogueCache: ProviderService[] | null = null;
let catalogueFetchedAt = 0;
let catalogueInFlight: Promise<ProviderService[]> | null = null;

async function fetchFullCatalogue(): Promise<ProviderService[]> {
  const data = await callProvider<{ data: unknown }>("/services");
  const list = Array.isArray(data.data) ? data.data : [];
  const normalized: ProviderService[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const s = normalizeProviderService(item as Record<string, unknown>);
    if (s) normalized.push(s);
  }
  return normalized;
}

async function getCatalogue(): Promise<ProviderService[]> {
  const isStale = Date.now() - catalogueFetchedAt > CATALOGUE_TTL_MS;

  if (catalogueCache && !isStale) return catalogueCache;

  if (catalogueCache && isStale) {
    if (!catalogueInFlight) {
      catalogueInFlight = fetchFullCatalogue()
        .then(fresh => {
          catalogueCache = fresh;
          catalogueFetchedAt = Date.now();
          return fresh;
        })
        .catch(() => catalogueCache as ProviderService[])
        .finally(() => { catalogueInFlight = null; });
    }
    return catalogueCache;
  }

  if (!catalogueInFlight) {
    catalogueInFlight = fetchFullCatalogue()
      .then(fresh => {
        catalogueCache = fresh;
        catalogueFetchedAt = Date.now();
        return fresh;
      })
      .finally(() => { catalogueInFlight = null; });
  }
  return catalogueInFlight;
}

export async function listProviderServices(q?: string, category?: string): Promise<ProviderService[]> {
  const all = await getCatalogue();
  if (!q && !category) return all;
  const qLower = q?.toLowerCase();
  return all.filter(s => {
    const matchesQ = !qLower || s.name.toLowerCase().includes(qLower) || s.category.toLowerCase().includes(qLower);
    const matchesCategory = !category || s.category === category;
    return matchesQ && matchesCategory;
  });
}

export interface ProviderOrderResult {
  order_id: number;
  status: string;
  cost_xd: number;
}

export async function placeProviderOrder(input: { service_id: number; provider: string; link: string; quantity: number }): Promise<ProviderOrderResult> {
  const data = await callProvider<{ data: ProviderOrderResult }>("/services/order", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.data;
}

export async function getProviderOrderStatus(orderId: string | number): Promise<{ status: string; quantity?: number }> {
  const data = await callProvider<{ data: { status: string; quantity?: number } }>(`/services/order/${orderId}`);
  return data.data;
}
