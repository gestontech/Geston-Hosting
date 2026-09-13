import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";

const mockUserId = "507f1f77bcf86cd799439011";

vi.mock("../../../middleware/auth.js", () => ({
  authGuard: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { _id: mockUserId };
    next();
  },
}));

const UserFindById = vi.fn();
const UserFindByIdAndDelete = vi.fn();

vi.mock("../../../models/User.js", () => ({
  User: {
    findById: (...args: unknown[]) => UserFindById(...args),
    findByIdAndDelete: (...args: unknown[]) => UserFindByIdAndDelete(...args),
  },
}));

const BotFind = vi.fn();
const BotDeleteMany = vi.fn();

vi.mock("../../../models/Bot.js", () => ({
  Bot: {
    find: (...args: unknown[]) => BotFind(...args),
    deleteMany: (...args: unknown[]) => BotDeleteMany(...args),
  },
}));

const deleteApp = vi.fn();

vi.mock("../../../services/heroku.js", () => ({
  deleteApp: (...args: unknown[]) => deleteApp(...args),
}));

const userPayload = vi.fn();

vi.mock("../shared.js", () => ({
  userPayload: (...args: unknown[]) => userPayload(...args),
}));

import sessionRouter from "../session.js";
import { errorHandler } from "../../../lib/errors.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", sessionRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  BotFind.mockResolvedValue([]);
  deleteApp.mockResolvedValue(undefined);
});

describe("GET /api/auth/me", () => {
  it("returns the current user's payload", async () => {
    UserFindById.mockResolvedValue({ _id: mockUserId, email: "buyer@example.com" });
    userPayload.mockReturnValue({ id: mockUserId, email: "buyer@example.com" });

    const res = await request(buildApp()).get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: mockUserId, email: "buyer@example.com" } });
  });

  it("returns 401 when the user no longer exists", async () => {
    UserFindById.mockResolvedValue(null);

    const res = await request(buildApp()).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "User not found" });
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the auth cookie", async () => {
    const res = await request(buildApp()).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    expect(String(setCookie)).toMatch(/token=;/);
  });
});

describe("DELETE /api/auth/me", () => {
  it("deletes the account and cascades bot deletion", async () => {
    BotFind.mockResolvedValue([{ herokuAppName: "app-1" }, { herokuAppName: "app-2" }]);
    UserFindByIdAndDelete.mockResolvedValue({ _id: mockUserId });

    const res = await request(buildApp()).delete("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(deleteApp).toHaveBeenCalledTimes(2);
    expect(BotDeleteMany).toHaveBeenCalledWith({ userId: mockUserId });
  });

  it("still succeeds even if deleting a Heroku app fails", async () => {
    BotFind.mockResolvedValue([{ herokuAppName: "app-1" }]);
    deleteApp.mockRejectedValue(new Error("heroku down"));
    UserFindByIdAndDelete.mockResolvedValue({ _id: mockUserId });

    const res = await request(buildApp()).delete("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 404 when the user no longer exists", async () => {
    UserFindByIdAndDelete.mockResolvedValue(null);

    const res = await request(buildApp()).delete("/api/auth/me");

    expect(res.status).toBe(404);
  });
});
