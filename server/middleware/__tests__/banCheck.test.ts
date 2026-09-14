import { describe, it, expect, vi } from "vitest";
import { banCheck } from "../banCheck.js";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../auth.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("banCheck", () => {
  it("returns 401 when no user", () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    banCheck({} as AuthRequest, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 with banReason when banned", () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    banCheck(
      { user: { isBanned: true, banReason: "Payment spam" } } as unknown as AuthRequest,
      res,
      next
    );
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ isBanned: true, banReason: "Payment spam" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user is not banned", () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    banCheck(
      { user: { isBanned: false, banReason: "" } } as unknown as AuthRequest,
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });
});
