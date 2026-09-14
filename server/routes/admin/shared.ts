import jwt from "jsonwebtoken";
import { User } from "../../models/User.js";
import { JWT_SECRET } from "../../lib/env.js";
import type { Request, Response, NextFunction } from "express";
import type { IUser } from "../../models/User.js";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();
export const TEAM_MAX_APPS = 100;
export const KES_PER_USD = 130;
export const NGN_PER_USD = 1500;
export const XAF_PER_USD = 600;
export const TZS_PER_USD = 2600;

export interface AdminRequest extends Request {
  user?: IUser;
}

export async function adminAuth(req: AdminRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
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
