import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { CURRENCIES, isValidCurrency } from "../utils/currency.js";

const router = Router();

router.get("/list", (_req, res) => {
  res.json(CURRENCIES);
});

router.patch("/set", authGuard, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ currency: z.string().min(2).max(6) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid currency" }); return; }
    const code = parsed.data.currency.toUpperCase();
    if (!isValidCurrency(code)) { res.status(400).json({ error: "Unsupported currency" }); return; }
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    user.currency = code;
    user.currencySet = true;
    await user.save();
    res.json({ ok: true, currency: code });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
