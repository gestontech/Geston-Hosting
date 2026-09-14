import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";

export const banCheck = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const isBanned = (user as unknown as { isBanned?: boolean }).isBanned;
  if (isBanned) {
    const banReason = (user as unknown as { banReason?: string }).banReason || "";
    res.status(403).json({
      error: banReason
        ? `Your account has been banned: ${banReason}`
        : "Your account has been banned. Contact support for assistance.",
      banReason: banReason || undefined,
      isBanned: true,
    });
    return;
  }
  next();
};
