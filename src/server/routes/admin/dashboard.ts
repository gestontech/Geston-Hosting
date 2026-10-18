import { Router } from "express";
import { User } from "../../models/User.js";
import { Bot } from "../../models/Bot.js";
import { Transaction } from "../../models/Transaction.js";
import { Coupon } from "../../models/Coupon.js";
import { Referral } from "../../models/Referral.js";
import { Panel } from "../../models/Panel.js";
import { ADMIN_EMAIL, KES_PER_USD, NGN_PER_USD, XAF_PER_USD, TZS_PER_USD } from "./shared.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [allUsers, allBots, allTx, allCoupons, allReferrals, totalPanels] = await Promise.all([
      User.find({}).lean(),
      Bot.find({}).lean(),
      Transaction.find({ status: "success" }).lean(),
      Coupon.find({}).lean(),
      Referral.find({}).lean(),
      Panel.countDocuments()
    ]);
    const nonAdminUsers = allUsers.filter(u => (u.email || "").toLowerCase() !== ADMIN_EMAIL);
    const totalTxInCirculation = nonAdminUsers.reduce((s, u) => s + (u.txCoins || 0), 0);
    const revenueTx = allTx.filter(t => t.type !== "admin_grant");
    const totalRevenue = revenueTx.reduce((s, t) => s + (t.ksAmount || 0), 0);
    res.json({
      totalUsers: nonAdminUsers.length,
      totalBots: allBots.length,
      activeBots: allBots.filter(b => b.status === "running").length,
      totalRevenue,
      totalTxInCirculation,
      totalTransactions: allTx.length,
      totalCoupons: allCoupons.length,
      claimedCoupons: allCoupons.filter(c => c.claimedBy).length,
      totalReferrals: allReferrals.length,
      totalPanels
    });
  } catch (err) { next(err); }
});

router.get("/revenue", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const allTx = await Transaction.find({ status: "success", type: { $ne: "admin_grant" } }).lean();
    const byCountry: Record<string, { amount: number; count: number }> = {};
    for (const tx of allTx) {
      const country = (tx.paystackCountry as string) || "kenya";
      if (!byCountry[country]) byCountry[country] = { amount: 0, count: 0 };
      byCountry[country].amount += tx.ksAmount || 0;
      byCountry[country].count += 1;
    }
    const kenyaKes = byCountry["kenya"]?.amount || 0;
    const nigeriaNgn = byCountry["nigeria"]?.amount || 0;
    const cameroonXaf = byCountry["cameroon"]?.amount || 0;
    const nigeriaKes = nigeriaNgn * (KES_PER_USD / NGN_PER_USD);
    const cameroonKes = cameroonXaf * (KES_PER_USD / XAF_PER_USD);
    const tanzaniaTzs = byCountry["tanzania"]?.amount || 0;
    const tanzaniaKes = tanzaniaTzs * (KES_PER_USD / TZS_PER_USD);
    const totalKes = kenyaKes + nigeriaKes + cameroonKes + tanzaniaKes;
    const totalUsd = totalKes / KES_PER_USD;
    res.json({
      countries: [
        {
          name: "Kenya",
          flag: "🇰🇪",
          currency: "KES",
          amount: kenyaKes,
          amountKes: kenyaKes,
          amountUsd: kenyaKes / KES_PER_USD,
          count: byCountry["kenya"]?.count || 0
        },
        {
          name: "Nigeria",
          flag: "🇳🇬",
          currency: "NGN",
          amount: nigeriaNgn,
          amountKes: nigeriaKes,
          amountUsd: nigeriaNgn / NGN_PER_USD,
          count: byCountry["nigeria"]?.count || 0
        },
        {
          name: "Cameroon",
          flag: "🇨🇲",
          currency: "XAF",
          amount: cameroonXaf,
          amountKes: cameroonKes,
          amountUsd: cameroonXaf / XAF_PER_USD,
          count: byCountry["cameroon"]?.count || 0
          },
          {
            name: "Tanzania",
            flag: "🇹🇿",
            currency: "TZS",
            amount: tanzaniaTzs,
            amountKes: tanzaniaKes,
            amountUsd: tanzaniaTzs / TZS_PER_USD,
            count: byCountry["tanzania"]?.count || 0
          }
        ],
      totalKes,
      totalUsd
    });
  } catch (err) { next(err); }
});

export default router;
