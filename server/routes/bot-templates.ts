import { Router } from "express";
import { z } from "zod";
import { BotTemplate } from "../models/BotTemplate.js";
import { Bot } from "../models/Bot.js";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import type { Request, Response, NextFunction } from "express";
import type { IUser } from "../models/User.js";
import { JWT_SECRET } from "../lib/env.js";

const router = Router();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();

/** Hard fallback used when app.json / DB has no logo */
export const DEFAULT_GESTON_MD_LOGO =
  "https://hosting.gestontech.online/logo/icon.png";

interface AdminReq extends Request {
  user?: IUser;
}

async function adminAuth(req: AdminReq, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).lean();
    if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.user = user as unknown as IUser;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/** Fetch logo/image from a Heroku-style app.json on the given GitHub repo. */
export async function fetchAppJson(repoUrl: string): Promise<{ imageUrl: string }> {
  try {
    const match = String(repoUrl || "").match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
    if (!match) return { imageUrl: "" };
    const owner = match[1];
    const cleanRepo = match[2].replace(/\.git$/i, "");
    const branches = ["main", "master", "develop"];
    for (const branch of branches) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/app.json`;
        const res = await fetch(rawUrl, {
          signal: AbortSignal.timeout(8000),
          headers: { Accept: "application/json", "User-Agent": "Geston-Hosting" },
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { logo?: string; image?: string; icon?: string };
        const imageUrl = String(data.logo || data.image || data.icon || "").trim();
        if (imageUrl) return { imageUrl };
      } catch {
        /* try next branch */
      }
    }
    return { imageUrl: "" };
  } catch {
    return { imageUrl: "" };
  }
}

function withLogo<T extends Record<string, unknown> & {
  imageUrl?: string;
  isDefault?: boolean;
  githubRepo?: string;
}>(
  t: T
): T & { imageUrl: string } {
  const url = String(t.imageUrl || "").trim();

  if (url) {
    return { ...t, imageUrl: url };
  }

  const repo = String(t.githubRepo || "").toLowerCase();

  if (repo.includes("mruniquehacker/knightbot-md")) {
    return {
      ...t,
      imageUrl: DEFAULT_KNIGHTBOT_MD_LOGO,
    };
  }

  if (t.isDefault) {
    return {
      ...t,
      imageUrl: DEFAULT_GESTON_MD_LOGO,
    };
  }

  return {
    ...t,
    imageUrl: "",
  };
}

/** Public — no login required so the bots page always loads logos for guests too */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Default always first, then alphabetical by name
    let templates = await BotTemplate.find({ active: true }).sort({
      isDefault: -1,
      name: 1,
    });

    const needImage = templates.filter((t) => !String(t.imageUrl || "").trim() && t.githubRepo);
    if (needImage.length > 0) {
      await Promise.all(
        needImage.map(async (t) => {
          const { imageUrl } = await fetchAppJson(t.githubRepo);
          const finalUrl =
            imageUrl || (t.isDefault ? DEFAULT_GESTON_MD_LOGO : "");
          if (finalUrl) {
            t.imageUrl = finalUrl;
            await t.save().catch(() => {});
          }
        })
      );
      templates = await BotTemplate.find({ active: true }).sort({
        isDefault: -1,
        name: 1,
      });
    }

    for (const t of templates) {
      if (t.isDefault && !String(t.imageUrl || "").trim()) {
        t.imageUrl = DEFAULT_GESTON_MD_LOGO;
        await t.save().catch(() => {});
      }
    }

    const lean = templates.map((t) =>
      withLogo(t.toObject() as Record<string, unknown> & { imageUrl?: string; isDefault?: boolean })
    );
    const templateIds = lean.map((t) => String((t as { _id?: unknown })._id || ""));
    const templateNames = lean
      .map((t) => String((t as { name?: string }).name || ""))
      .filter(Boolean);

    // Count by templateId; also count bots that only have templateName (older deploys)
    const counts = await Bot.aggregate([
      {
        $match: {
          status: { $ne: "deleted" },
          $or: [
            { templateId: { $in: templateIds } },
            { templateName: { $in: templateNames } },
          ],
        },
      },
      {
        $group: {
          _id: {
            tid: "$templateId",
            tname: "$templateName",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const countById: Record<string, number> = {};
    const countByName: Record<string, number> = {};
    for (const c of counts) {
      const tid = String(c._id?.tid || "");
      const tname = String(c._id?.tname || "");
      if (tid) countById[tid] = (countById[tid] || 0) + c.count;
      if (tname) countByName[tname] = (countByName[tname] || 0) + c.count;
    }

    res.json(
      lean.map((t) => {
        const id = String((t as { _id?: unknown })._id || "");
        const name = String((t as { name?: string }).name || "");
        const deployCount = countById[id] || countByName[name] || 0;
        return { ...t, deployCount };
      })
    );
  } catch (err) {
    next(err);
  }
});

router.get("/slug/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let template = await BotTemplate.findOne({ shareableSlug: req.params.slug, active: true });
    if (!template) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }
    if (!String(template.imageUrl || "").trim() && template.githubRepo) {
      const { imageUrl } = await fetchAppJson(template.githubRepo);
      template.imageUrl =
        imageUrl || (template.isDefault ? DEFAULT_GESTON_MD_LOGO : "");
      await template.save().catch(() => {});
    }
    res.json(
      withLogo(template.toObject() as Record<string, unknown> & { imageUrl?: string; isDefault?: boolean })
    );
  } catch (err) {
    next(err);
  }
});

const addSchema = z.object({
  name: z.string().min(2),
  githubRepo: z.string().url(),
  sessionIdUrl: z.string().url(),
  costTx: z.number().min(0).default(10),
});

const editSchema = z.object({
  name: z.string().min(2).optional(),
  githubRepo: z.string().url().optional(),
  sessionIdUrl: z.string().url().optional(),
  costTx: z.number().min(0).optional(),
});

function makeSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${rand}`;
}

router.post("/", adminAuth, async (req: AdminReq, res: Response, next: NextFunction) => {
  try {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const { name, githubRepo, sessionIdUrl, costTx } = parsed.data;
    const { imageUrl } = await fetchAppJson(githubRepo);
    const shareableSlug = makeSlug(name);
    const count = await BotTemplate.countDocuments();
    const template = await BotTemplate.create({
      name,
      githubRepo,
      sessionIdUrl,
      imageUrl,
      shareableSlug,
      costTx,
      isDefault: false,
      active: true,
      order: count,
    });
    res.json({ ok: true, template });
  } catch (err) {
    next(err);
  }
});

/** Edit template info (name, repo, session URL, cost) — no delete required */
router.patch("/:id", adminAuth, async (req: AdminReq, res: Response, next: NextFunction) => {
  try {
    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }
    const template = await BotTemplate.findById(req.params.id);
    if (!template) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { name, githubRepo, sessionIdUrl, costTx } = parsed.data;
    if (name !== undefined) template.name = name;
    if (githubRepo !== undefined) {
      template.githubRepo = githubRepo;
      const { imageUrl } = await fetchAppJson(githubRepo);
      if (imageUrl) template.imageUrl = imageUrl;
      else if (template.isDefault) template.imageUrl = DEFAULT_GESTON_MD_LOGO;
    }
    if (sessionIdUrl !== undefined) template.sessionIdUrl = sessionIdUrl;
    if (costTx !== undefined) template.costTx = costTx;
    await template.save();
    res.json({ ok: true, template });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", adminAuth, async (req: AdminReq, res: Response, next: NextFunction) => {
  try {
    const template = await BotTemplate.findById(req.params.id);
    if (!template) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (template.isDefault) {
      res.status(400).json({ error: "Cannot remove the default bot" });
      return;
    }
    await BotTemplate.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/refresh-image", adminAuth, async (req: AdminReq, res: Response, next: NextFunction) => {
  try {
    const template = await BotTemplate.findById(req.params.id);
    if (!template) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { imageUrl } = await fetchAppJson(template.githubRepo);
    template.imageUrl =
      imageUrl || (template.isDefault ? DEFAULT_GESTON_MD_LOGO : "");
    await template.save();
    res.json({ ok: true, imageUrl: template.imageUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
