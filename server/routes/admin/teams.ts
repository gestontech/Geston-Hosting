import { Router } from "express";
import { Team } from "../../models/Team.js";
import { getTeamAppCount } from "../../services/heroku.js";
import { TEAM_MAX_APPS } from "./shared.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/teams", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find({}).lean();
    const counts = await Promise.all(teams.map(async t => {
      const count = await getTeamAppCount((t as unknown as { name: string }).name).catch(() => 0);
      return { ...(t as object), appCount: count, remaining: TEAM_MAX_APPS - count };
    }));
    res.json(counts);
  } catch (err) { next(err); }
});

router.post("/teams", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, label, active } = req.body || {};
    if (!name) { res.status(400).json({ error: "Team name is required" }); return; }
    const team = await Team.create({ name, label: label || name, active: active !== false });
    res.json({ ok: true, team });
  } catch (err) { next(err); }
});

router.patch("/teams/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { label, active } = req.body || {};
    const team = await Team.findByIdAndUpdate(req.params.id, { label, active }, { new: true });
    if (!team) { res.status(404).json({ error: "Team not found" }); return; }
    res.json({ ok: true, team });
  } catch (err) { next(err); }
});

router.delete("/teams/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
