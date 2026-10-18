const DEFAULT_SITE = "https://hosting.gestontech.online";

export function getSiteUrl(): string {
  let raw = String(
    process.env.SITE_URL ||
      process.env.CLIENT_URL ||
      process.env.APP_URL ||
      DEFAULT_SITE
  )
    .trim()
    .replace(/\/$/, "");

  if (!raw) raw = DEFAULT_SITE;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  try {
    const u = new URL(raw);
    let host = u.hostname.toLowerCase();
    host = host.replace(/^(hosting\.)+hosting\./, "hosting.");
    if (host === "hosting.hosting.gestontech.online") host = "hosting.gestontech.online";
    u.hostname = host;
    u.hash = "";
    u.search = "";
    let out = u.toString().replace(/\/$/, "");
    return out || DEFAULT_SITE;
  } catch {
    return DEFAULT_SITE;
  }
}

export function getBoostShopUrl(): string {
  return getSiteUrl() + "/services/boosting";
}

export function getPanelShopUrl(): string {
  return getSiteUrl() + "/purchase-panels";
}
