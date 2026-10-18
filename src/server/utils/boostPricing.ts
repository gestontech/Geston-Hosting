/** Fixed profit margin added on top of TXH API base price (KES per 1000). */
export const BOOST_MARGIN_KES = 50;

/**
 * Sell price shown to customers = provider base cost + our 50 KES profit.
 * Example: the TXH API returns 70 → site shows 120.
 */
export function sellPriceKesPer1000(baseKesPer1000: number): number {
  const base = Number(baseKesPer1000);
  const safeBase = Number.isFinite(base) && base >= 0 ? base : 0;
  return Math.round((safeBase + BOOST_MARGIN_KES) * 100) / 100;
}
