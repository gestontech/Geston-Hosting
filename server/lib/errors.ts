import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger.js";

export class AppError extends Error {
  statusCode: number;
  code?: string;
  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.error({ err: { message: err.message, code: err.code } }, "AppError");
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  const message = err instanceof Error ? err.message : "Server error";
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Server error" });
}
