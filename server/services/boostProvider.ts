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
  if (!res.ok || !data) {
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

interface TxhCatalogueResponse {
  services: Array<{
    id: number;
    name: string;
    category: string;
    pricePer1000Kes: number;
    min: number;
    max: number;
  }>;
}

async function fetchFullCatalogue(): Promise<ProviderService[]> {
  const data = await callProvider<TxhCatalogueResponse>("/boost/services?currency=KES");
  const list = Array.isArray(data.services) ? data.services : [];
  const normalized: ProviderService[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const id = Number(item.id);
    const name = String(item.name || "").trim();
    if (!Number.isFinite(id) || !name) continue;
    normalized.push({
      id,
      name,
      category: String(item.category || ""),
      // The upstream response doesn't include a separate "provider" field —
      // we only need this to satisfy the shared ProviderService shape.
      provider: "txh",
      price_per_1000_ksh: Number.isFinite(Number(item.pricePer1000Kes)) ? Number(item.pricePer1000Kes) : 0,
      min: Math.max(1, Number(item.min) || 1),
      max: Math.max(1, Number(item.max) || 100000),
    });
  }
  return normalized;
}

const CATALOGUE_TTL_MS = 10 * 60 * 1000;
let catalogueCache: ProviderService[] | null = null;
let catalogueFetchedAt = 0;
let catalogueInFlight: Promise<ProviderService[]> | null = null;

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

interface TxhOrderResponse {
  ok: boolean;
  order: {
    id: string | number;
    status: string;
    costTx?: number;
    costKes?: number;
    balanceLeft?: number;
  };
}

export async function placeProviderOrder(input: { service_id: number; provider: string; link: string; quantity: number }): Promise<ProviderOrderResult> {
  const data = await callProvider<TxhOrderResponse>("/boost/order", {
    method: "POST",
    body: JSON.stringify({
      serviceId: input.service_id,
      link: input.link,
      quantity: input.quantity,
    }),
  });
  return {
    order_id: Number(data.order.id) || 0,
    status: data.order.status || "pending",
    cost_xd: data.order.costKes || 0,
  };
}

export async function getProviderOrderStatus(orderId: string | number): Promise<{ status: string; quantity?: number }> {
  const data = await callProvider<{ status: string }>(`/boost/orders/${orderId}/refresh`);
  return { status: data.status };
}
