import { Router } from "express";
import { Tutorial } from "../models/Tutorial.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tutorials = await Tutorial.find({}).sort({ order: 1, createdAt: -1 }).lean();
    res.json(tutorials);
  } catch (err) { next(err); }
});

export default router;