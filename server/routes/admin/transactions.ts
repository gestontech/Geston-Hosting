import { Router } from "express";
import { Transaction } from "../../models/Transaction.js";
import { User } from "../../models/User.js";
import { NGN_PER_USD, XAF_PER_USD, TZS_PER_USD, KES_PER_USD } from "./shared.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/transactions", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const txs = await Transaction.find({}).sort({ createdAt: -1 }).limit(500).lean();
    const userMap: Record<string, { email: string; username?: string }> = {};
    const users = await User.find({}).select("email username").lean();
    for (const u of users) { userMap[u._id.toString()] = { email: u.email, username: u.username || "" }; }
    const countryMeta: Record<string, { code: string; rateFromKes: number }> = {
      kenya: { code: "KES", rateFromKes: 1 },
      nigeria: { code: "NGN", rateFromKes: NGN_PER_USD / KES_PER_USD },
      cameroon: { code: "XAF", rateFromKes: XAF_PER_USD / KES_PER_USD },
      tanzania: { code: "TZS", rateFromKes: TZS_PER_USD / KES_PER_USD },
      drc: { code: "USD", rateFromKes: 1 / KES_PER_USD },
    };
    res.json(txs.map(t => {
      const country = (t.paystackCountry as string) || "kenya";
      const meta = countryMeta[country] || countryMeta.kenya;
      const localAmount = Math.round((t.ksAmount || 0) * meta.rateFromKes * 100) / 100;
      return {
        _id: t._id,
        type: t.type,
        txAmount: t.txAmount,
        txSign: t.type === "admin_grant" || t.type === "topup" || t.type === "refund" ? "+" : "-",
        ksAmount: t.ksAmount,
        localAmount,
        localCurrency: meta.code,
        status: t.status,
        paystackRef: t.paystackRef,
        paystackCountry: country,
        ownerEmail: userMap[t.userId?.toString()]?.email || "unknown",
        ownerUsername: userMap[t.userId?.toString()]?.username || "",
        userId: t.userId?.toString() || "",
        createdAt: t.createdAt
      };
    }));
  } catch (err) { next(err); }
});

router.delete("/transactions/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete("/transactions/bulk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: "No IDs provided" }); return; }
    await Transaction.deleteMany({ _id: { $in: ids } });
    res.json({ ok: true, deleted: ids.length });
  } catch (err) { next(err); }
});

router.post("/transactions/resolve-stale", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const result = await Transaction.updateMany(
      { status: "pending", createdAt: { $lt: cutoff } },
      { $set: { status: "failed" } }
    );
    res.json({ ok: true, updated: result.modifiedCount });
  } catch (err) { next(err); }
});

export default router;
