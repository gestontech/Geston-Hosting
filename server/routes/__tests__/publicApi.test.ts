import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
const mockUserId = "507f1f77bcf86cd799439011";
vi.mock("../../middleware/apiKeyAuth.js", () => ({
  apiKeyGuard: (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    (req as any).user = {
      _id: mockUserId,
      email: "api@example.com",
      username: "apiuser",
      txCoins: 0,
      currency: "KES",
      apiCallCount: 3,
    };
    (req as any).viaApiKey = true;
    next();
  },
}));
const BotTemplateFind = vi.fn();
const BotFind = vi.fn();
const BotFindOne = vi.fn();
vi.mock("../../models/BotTemplate.js", () => ({
  BotTemplate: {
    find: (...args: unknown[]) =>
      BotTemplateFind(...args),
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));
vi.mock("../../models/Bot.js", () => ({
  Bot: {
    find: (...args: unknown[]) =>
      BotFind(...args),
    findOne: (...args: unknown[]) =>
      BotFindOne(...args),
    create: vi.fn(),
    deleteOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));
vi.mock("../../models/User.js", () => ({
  User: {
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock("../../models/Transaction.js", () => ({
  Transaction: {
    create: vi.fn(),
  },
}));
vi.mock("../../models/Team.js", () => ({
  Team: {
    find: vi.fn(),
  },
}));
vi.mock("../../models/TrialCheck.js", () => ({
  TrialCheck: {
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock("../../models/BlockedTrial.js", () => ({
  BlockedTrial: {
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock("../../services/heroku.js", () => ({
  deployBotApp: vi.fn(),
  deleteApp: vi.fn(),
  findBestTeam: vi.fn(),
  setConfigVar: vi.fn(),
  enableMaintenanceMode: vi.fn(),
  disableMaintenanceMode: vi.fn(),
  restartApp: vi.fn(),
  getSetupStatus: vi.fn(),
  appExists: vi.fn(),
}));
vi.mock("../../lib/featureFlags.js", () => ({
  isServiceDisabled: vi.fn().mockResolvedValue(false),
}));
vi.mock("../../services/notifications.js", () => ({
  createNotification: vi.fn(),
}));
vi.mock("../../services/botRefund.js", () => ({
  refundBotCost: vi.fn(),
}));
vi.mock("../../services/notify.js", () => ({
  notifyOwner: vi.fn(),
}));
import publicApiRouter from "../publicApi.js";
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1",
    publicApiRouter,
  );
  return app;
}
beforeEach(() => {
  vi.clearAllMocks();
});
describe("GET /api/v1/me", () => {
  it("returns the API key owner's profile in free mode", async () => {
    const res = await request(
      buildApp(),
    ).get("/api/v1/me");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email: "api@example.com",
      username: "apiuser",
      txCoins: 0,
      currency: "KES",
      apiCallCount: 3,
    });
  });
});
describe("GET /api/v1/templates", () => {
  it("lists active templates with a zero cost", async () => {
    const lean = vi.fn().mockResolvedValue([
      {
        _id: "t1",
        name: "Geston-MD",
        shareableSlug: "geston-md",
        costTx: 0,
        isDefault: true,
        imageUrl: null,
        sessionIdUrl:
          "https://example.com",
      },
    ]);
    const select = vi.fn().mockReturnValue({
      lean,
    });
    const sort = vi.fn().mockReturnValue({
      select,
    });
    BotTemplateFind.mockReturnValue({
      sort,
    });
    const res = await request(
      buildApp(),
    ).get("/api/v1/templates");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: "t1",
      name: "Geston-MD",
      slug: "geston-md",
      costTx: 0,
      isDefault: true,
    });
  });
  it("returns 500 when DB fails", async () => {
    const lean = vi.fn().mockRejectedValue(
      new Error("db"),
    );
    const select = vi.fn().mockReturnValue({
      lean,
    });
    const sort = vi.fn().mockReturnValue({
      select,
    });
    BotTemplateFind.mockReturnValue({
      sort,
    });
    const res = await request(
      buildApp(),
    ).get("/api/v1/templates");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
describe("GET /api/v1/bots", () => {
  it("lists the account bots", async () => {
    const lean = vi.fn().mockResolvedValue([
      {
        _id: "b1",
        herokuAppName: "my-bot",
        status: "running",
        isTrial: false,
        templateName: "Geston-MD",
        expiresAt:
          new Date("2026-12-01"),
        deployedAt:
          new Date("2026-01-01"),
      },
    ]);
    const sort = vi.fn().mockReturnValue({
      lean,
    });
    BotFind.mockReturnValue({
      sort,
    });
    const res = await request(
      buildApp(),
    ).get("/api/v1/bots");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0]).toMatchObject({
      id: "b1",
      name: "my-bot",
      status: "running",
      templateName: "Geston-MD",
    });
    expect(BotFind).toHaveBeenCalledWith({
      userId: mockUserId,
      status: {
        $ne: "deleted",
      },
    });
  });
});
describe("GET /api/v1/bots/:id", () => {
  it("returns 404 when bot is missing", async () => {
    BotFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    const res = await request(
      buildApp(),
    ).get("/api/v1/bots/missing");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(
      /not found/i,
    );
  });
  it("returns a single bot", async () => {
    BotFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "b1",
        herokuAppName: "my-bot",
        status: "running",
        isTrial: false,
        templateName: "Geston-MD",
        expiresAt:
          new Date("2026-12-01"),
        deployedAt:
          new Date("2026-01-01"),
      }),
    });
    const res = await request(
      buildApp(),
    ).get("/api/v1/bots/b1");
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(
      "my-bot",
    );
  });
});
