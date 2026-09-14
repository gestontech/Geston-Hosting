import { describe, it, expect, vi } from "vitest";
import { AppError, errorHandler } from "../errors.js";
import type { Request, Response, NextFunction } from "express";

describe("AppError", () => {
  it("creates error with status and message", () => {
    const err = new AppError("Not found", 404, "NOT_FOUND");
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("AppError");
  });

  it("defaults status to 500", () => {
    const err = new AppError("fail");
    expect(err.statusCode).toBe(500);
  });
});

describe("errorHandler", () => {
  it("handles AppError with status and body", () => {
    const err = new AppError("Bad request", 400, "BAD");
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    errorHandler(err, {} as Request, res, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Bad request", code: "BAD" });
  });

  it("handles unknown errors as 500", () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    errorHandler(new Error("boom"), {} as Request, res, {} as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
  });
});
