import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { Transaction } from "../../models/Transaction.js";
import { createOPTCheckoutSession, generateOPTReference, isOPTGatewayAvailable } from "../../services/optgateway.js";

const router = Router();

const DRC_PACKAGES: Record<string, { txAmount: number; bonusTx: number; usdPrice: number; name: string }> = {
  cd_starter: { name: "Starter", txAmount: 10, bonusTx: 0, usdPrice: 2 },
  cd_basic: { name: "Basic", txAmount: 20, bonusTx: 0, usdPrice: 4 },
  cd_standard: { name: "Standard", txAmount: 30, bonusTx: 0, usdPrice: 6 },
  cd_pro: { name: "Pro", txAmount: 50, bonusTx: 5, usdPrice: 10 },
  cd_elite: { name: "Elite", txAmount: 100, bonusTx: 10, usdPrice: 20 },
  cd_ultimate: { name: "Ultimate", txAmount: 200, bonusTx: 20, usdPrice: 40 },
};

function appUrl(req: any) {
  const v = process.env.APP_URL || process.env.CLIENT_URL || process.env.SITE_URL;
  return (v || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

router.post("/initiate-drc", requireAuth, async (req: any, res) => {
  try {
    if (!isOPTGatewayAvailable()) {
      return res.status(503).json({ error: "Le paiement OPTGateway n'est pas configuré." });
    }

    const packageId = String(req.body?.packageId || "");
    const pkg = DRC_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: "Pack RDC invalide." });

    const reference = generateOPTReference();
    const totalTx = pkg.txAmount + pkg.bonusTx;

    await Transaction.create({
      userId: req.user._id,
      type: "topup",
      txAmount: totalTx,
      ksAmount: 0,
      paymentAmount: pkg.usdPrice,
      currency: "USD",
      reference,
      provider: "optgateway",
      country: "drc",
      paystackRef: reference,
      paystackCountry: "drc",
      status: "pending",
    });

    const checkout = await createOPTCheckoutSession({
      amount: pkg.usdPrice,
      currency: "USD",
      reference,
      description: `Geston Hosting - ${pkg.name} - ${totalTx} Coins`,
      returnUrl: `${appUrl(req)}/dashboard?payment=return&reference=${encodeURIComponent(reference)}`,
      cancelUrl: `${appUrl(req)}/topup?payment=cancelled&reference=${encodeURIComponent(reference)}`,
    });

    if (!checkout.success) {
      await Transaction.updateOne({ reference, status: "pending" }, { $set: { status: "failed" } });
      return res.status(502).json({ error: checkout.message });
    }

    return res.json({ checkoutUrl: checkout.url, reference });
  } catch (e) {
    console.error("[OPT] initiate-drc", e);
    return res.status(500).json({ error: "Impossible de lancer le paiement." });
  }
});

export default router;
