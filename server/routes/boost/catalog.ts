import { Router, type Request, type Response } from "express";
import {
  listCachedServices,
  listCachedCategories,
  ensureBoostCatalogueSynced,
  getCatalogueMeta,
} from "../../services/boostCatalogSync.js";
import { convertFromKes, isValidCurrency } from "../../utils/currency.js";
import { sellPriceKesPer1000 } from "../../utils/boostPricing.js";

const router = Router();

/** Public — catalogue is safe to browse without login */
router.get("/services", async (req: Request, res: Response) => {
  try {
    await ensureBoostCatalogueSynced();
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const currencyParam =
      typeof req.query.currency === "string" ? req.query.currency.toUpperCase() : "KES";
    const currency = isValidCurrency(currencyParam) ? currencyParam : "KES";

    let services = await listCachedServices(q, category);
    if (!services.length) {
      await ensureBoostCatalogueSynced();
      services = await listCachedServices(q, category);
    }
    const mapped = services.map((s) => {
      const sellKesPer1000 = sellPriceKesPer1000(s.baseKesPer1000);
      return {
        id: s.providerId,
        name: s.name,
        category: s.category,
        pricePer1000: Math.round(convertFromKes(sellKesPer1000, currency) * 100) / 100,
        pricePer1000Kes: sellKesPer1000,
        currency,
        min: s.min,
        max: s.max,
        platformId: s.platformId,
        serviceType: s.serviceType,
        isRegionVariant: s.isRegionVariant,
      };
    });
    // Always cheapest → most expensive (stable tie-break by name)
    mapped.sort((a, b) => a.pricePer1000 - b.pricePer1000 || a.name.localeCompare(b.name));
    const meta = getCatalogueMeta();
    res.json({
      services: mapped,
      currency,
      catalogueCount: meta.count,
      catalogueUpdatedAt: meta.updatedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load services";
    res.status(502).json({ error: msg });
  }
});

/** Public — category list for filters */
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    await ensureBoostCatalogueSynced();
    const categories = (await listCachedCategories()).sort();
    res.json(categories);
  } catch {
    res.status(502).json({ error: "Failed to load categories" });
  }
});

export default router;
