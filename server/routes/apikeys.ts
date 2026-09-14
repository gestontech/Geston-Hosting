import { Router } from "express";
import { User } from "../models/User.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { generateApiKey, maskApiKey, encryptApiKey, decryptApiKey } from "../utils/apiKey.js";
import { authRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.get("/", authGuard, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      hasKey: !!user.apiKeyHash,
      maskedKey: user.apiKeyPrefix ? maskApiKey(user.apiKeyPrefix) : "",
      active: !!user.apiKeyActive,
      createdAt: user.apiKeyCreatedAt || null,
      lastUsedAt: user.apiKeyLastUsedAt || null,
      callCount: user.apiCallCount || 0,
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/generate", authGuard, authRateLimit, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { raw, hash, prefix } = generateApiKey();
    user.apiKeyHash = hash;
    user.apiKeyEncrypted = encryptApiKey(raw);
    user.apiKeyPrefix = prefix;
    user.apiKeyActive = true;
    user.apiKeyCreatedAt = new Date();
    user.apiCallCount = 0;
    await user.save();
    res.json({ ok: true, apiKey: raw });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/pause", authGuard, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user || !user.apiKeyHash) { res.status(404).json({ error: "No API key found" }); return; }
    user.apiKeyActive = false;
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/resume", authGuard, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user || !user.apiKeyHash) { res.status(404).json({ error: "No API key found" }); return; }
    user.apiKeyActive = true;
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/reveal", authGuard, authRateLimit, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user || !user.apiKeyHash) { res.status(404).json({ error: "No API key found" }); return; }
    if (!user.apiKeyEncrypted) { res.status(404).json({ error: "This key was created before reveal was supported. Regenerate to enable it." }); return; }
    try {
      const raw = decryptApiKey(user.apiKeyEncrypted);
      res.json({ apiKey: raw });
    } catch {
      res.status(500).json({ error: "Couldn't decrypt key" });
    }
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/", authGuard, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    user.apiKeyHash = "";
    user.apiKeyEncrypted = "";
    user.apiKeyPrefix = "";
    user.apiKeyActive = false;
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
