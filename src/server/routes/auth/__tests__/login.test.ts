import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../../../middleware/rateLimit.js", () => ({
  authRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const UserFindOne = vi.fn();

vi.mock("../../../models/User.js", () => ({
  User: { findOne: (...args: unknown[]) => UserFindOne(...args) },
}));

const bcryptCompare = vi.fn();

vi.mock("bcryptjs", () => ({
  default: { compare: (...args: unknown[]) => bcryptCompare(...args) },
}));

const generateToken = vi.fn();
const setAuthCookie = vi.fn();
const userPayload = vi.fn();

vi.mock("../shared.js", () => ({
  generateToken: (...args: unknown[]) => generateToken(...args),
  setAuthCookie: (...args: unknown[]) => setAuthCookie(...args),
  userPayload: (...args: unknown[]) => userPayload(...args),
}));

import loginRouter from "../login.js";
import { errorHandler } from "../../../lib/errors.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", loginRouter);
  app.use(errorHandler);
  return app;
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => "user1" },
    email: "buyer@example.com",
    username: "buyer",
    passwordHash: "hashed-password",
    isBanned: false,
    banReason: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  generateToken.mockReturnValue("jwt-token");
  userPayload.mockImplementation((u: any) => ({ id: u._id.toString(), email: u.email }));
});

describe("POST /api/auth/login", () => {
  it("returns 400 when the body is invalid", async () => {
    const res = await request(buildApp()).post("/api/auth/login").send({ usernameOrEmail: "" });
    expect(res.status).toBe(400);
    expect(UserFindOne).not.toHaveBeenCalled();
  });

  it("returns 401 when no account matches the email", async () => {
    UserFindOne.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/api/auth/login")
      .send({ usernameOrEmail: "nobody@example.com", password: "whatever" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });

  it("looks up by username when the input has no @", async () => {
    UserFindOne.mockResolvedValue(null);

    await request(buildApp())
      .post("/api/auth/login")
      .send({ usernameOrEmail: "buyer", password: "whatever" });

    expect(UserFindOne).toHaveBeenCalledWith({ username: "buyer" });
  });

  it("returns 403 with the ban reason for a banned account", async () => {
    UserFindOne.mockResolvedValue(fakeUser({ isBanned: true, banReason: "fraud" }));

    const res = await request(buildApp())
      .post("/api/auth/login")
      .send({ usernameOrEmail: "buyer@example.com", password: "whatever" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Your account has been banned: fraud",
      isBanned: true,
      banReason: "fraud",
    });
  });

  it("returns 400 when the account has no password set (OAuth-only)", async () => {
    UserFindOne.mockResolvedValue(fakeUser({ passwordHash: "" }));

    const res = await request(buildApp())
      .post("/api/auth/login")
      .send({ usernameOrEmail: "buyer@example.com", password: "whatever" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/GitHub or email link/i);
    expect(bcryptCompare).not.toHaveBeenCalled();
  });

  it("returns 401 when the password does not match", async () => {
    UserFindOne.mockResolvedValue(fakeUser());
    bcryptCompare.mockResolvedValue(false);

    const res = await request(buildApp())
      .post("/api/auth/login")
      .send({ usernameOrEmail: "buyer@example.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
    expect(generateToken).not.toHaveBeenCalled();
  });

  it("logs in successfully and sets the auth cookie", async () => {
    const user = fakeUser();
    UserFindOne.mockResolvedValue(user);
    bcryptCompare.mockResolvedValue(true);

    const res = await request(buildApp())
      .post("/api/auth/login")
      .send({ usernameOrEmail: "buyer@example.com", password: "correct" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: "jwt-token", user: { id: "user1", email: "buyer@example.com" } });
    expect(setAuthCookie).toHaveBeenCalledWith(expect.anything(), "jwt-token");
  });
});
