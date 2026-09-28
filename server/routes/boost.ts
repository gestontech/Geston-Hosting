import { Router } from "express";
import catalogRouter from "./boost/catalog.js";
import ordersRouter from "./boost/orders.js";
import { isServiceDisabled } from "../lib/featureFlags.js";

const router = Router();

/**
 * Geston Hosting — FREE MODE
 *
 * Les boosts sont gratuits.
 *
 * Les anciens endpoints de paiement :
 *   /order/pay/mpesa
 *   /order/pay/card
 *   /order/pay/drc
 *   /order/pay/tanzania
 *   /order/pay/cameroon
 *
 * ne sont volontairement plus montés.
 */
router.use(async (_req, res, next) => {
  if (await isServiceDisabled("boost")) {
    res.status(503).json({
      error: "Social media boosting is currently disabled",
      serviceDisabled: "boost",
    });
    return;
  }

  next();
});

/**
 * Catalogue des services.
 */
router.use(catalogRouter);

/**
 * Commandes gratuites.
 *
 * Le fichier orders.ts gère directement la création
 * et le traitement des commandes sans paiement.
 */
router.use(ordersRouter);

export default router;
