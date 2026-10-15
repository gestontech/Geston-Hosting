import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../../lib/env.js", () => ({ JWT_SECRET: "test-secret" }));

vi.stubEnv("ADMIN_EMAIL", "admin@example.com");

const UserFind = vi.fn();
const UserFindByIdAndUpdate = vi.fn();
const UserFindByIdAndDelete = vi.fn();
const UserFindById = vi.fn();

vi.mock("../../../models/User.js", () => ({
  User: {
    find: (...args: unknown[]) => UserFind(...args),
    findByIdAndUpdate: (...args: unknown[]) => UserFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args: unknown[]) => UserFindByIdAndDelete(...args),
    findById: (...args: unknown[]) => UserFindById(...args),
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

const TransactionCreate = vi.fn();

vi.mock("../../../models/Transaction.js", () => ({
  Transaction: { create: (...args: unknown[]) => TransactionCreate(...args) },
}));

vi.mock("../../../services/heroku.js", () => ({
  deleteApp: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../services/notifications.js", () => ({
  createNotification: vi.fn(() => Promise.resolve()),
}));

let usersRouter: typeof import("../users.js")["default"];
let errorHandler: typeof import("../../../lib/errors.js")["errorHandler"];

beforeEach(async () => {
  vi.clearAllMocks();
  ({ default: usersRouter } = await import("../users.js"));
  ({ errorHandler } = await import("../../../lib/errors.js"));
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", usersRouter);
  app.use(errorHandler);
  return app;
}

describe("GET /api/admin/users", () => {
  it("excludes the admin account and computes bot counts", async () => {
    UserFind.mockReturnValue({
      lean: () => Promise.resolve([
        { _id: { toString: () => "u1" }, email: "buyer@example.com", txCoins: 10 },
      ]),
    });
    BotFind.mockReturnValue({
      lean: () => Promise.resolve([
        { userId: { toString: () => "u1" } },
        { userId: { toString: () => "u1" } },
      ]),
    });

    const res = await request(buildApp()).get("/api/admin/users");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].botCount).toBe(2);
    expect(res.body[0].isAdmin).toBe(false);
    expect(UserFind).toHaveBeenCalledWith({ email: { $ne: "admin@example.com" } });
  });
});

describe("POST /api/admin/users/:id/ban", () => {
  it("bans the user with the given reason", async () => {
    UserFindByIdAndUpdate.mockResolvedValue({ _id: "u1" });

    const res = await request(buildApp())
      .post("/api/admin/users/u1/ban")
      .send({ reason: "spam" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(UserFindByIdAndUpdate).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ isBanned: true, banReason: "spam" }),
      { new: true }
    );
  });

  it("returns 404 when the user does not exist", async () => {
    UserFindByIdAndUpdate.mockResolvedValue(null);

    const res = await request(buildApp()).post("/api/admin/users/nope/ban").send({});

    expect(res.status).toBe(404);
  });
});

describe("POST /api/admin/users/:id/tx", () => {
  it("rejects a non-positive amount", async () => {
    const res = await request(buildApp())
      .post("/api/admin/users/u1/tx")
      .send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(UserFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("grants Coins and logs a transaction", async () => {
    UserFindByIdAndUpdate.mockResolvedValue({ _id: "u1", txCoins: 60 });

    const res = await request(buildApp())
      .post("/api/admin/users/u1/tx")
      .send({ amount: 50 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, txCoins: 60 });
    expect(TransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", type: "admin_grant", txAmount: 50 })
    );
  });
});

describe("DELETE /api/admin/users/:id", () => {
  it("deletes the user and cascades bot deletion", async () => {
    UserFindByIdAndDelete.mockResolvedValue({ _id: "u1" });
    BotFind.mockResolvedValue([{ herokuAppName: "app-1" }, { herokuAppName: "app-2" }]);

    const res = await request(buildApp()).delete("/api/admin/users/u1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(BotDeleteMany).toHaveBeenCalledWith({ userId: "u1" });
  });

  it("returns 404 when the user does not exist", async () => {
    UserFindByIdAndDelete.mockResolvedValue(null);

    const res = await request(buildApp()).delete("/api/admin/users/nope");

    expect(res.status).toBe(404);
    expect(BotDeleteMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/users/:id/moderator", () => {
  it("promotes a user to moderator and grants a 100 Coins bonus", async () => {
    const user = { _id: "u1", isModerator: false, txCoins: 0, save: vi.fn().mockResolvedValue(undefined) };
    UserFindById.mockResolvedValue(user);

    const res = await request(buildApp()).post("/api/admin/users/u1/moderator");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, isModerator: true });
    expect(user.txCoins).toBe(100);
    expect(TransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "admin_grant", txAmount: 100 })
    );
  });

  it("demotes a moderator without granting Coins", async () => {
    const user = { _id: "u1", isModerator: true, txCoins: 0, save: vi.fn().mockResolvedValue(undefined) };
    UserFindById.mockResolvedValue(user);

    const res = await request(buildApp()).post("/api/admin/users/u1/moderator");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, isModerator: false });
    expect(TransactionCreate).not.toHaveBeenCalled();
  });
});
