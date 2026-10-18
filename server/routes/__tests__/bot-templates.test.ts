import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";

const mockUserId = "507f1f77bcf86cd799439011";

vi.mock("../../middleware/sessionOrApiKey.js", () => ({
  sessionOrApiKeyGuard: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock("../../middleware/banCheck.js", () => ({
  banCheck: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const BotTemplateFind = vi.fn();
const BotTemplateFindOne = vi.fn();
const BotTemplateFindById = vi.fn();
const BotTemplateCountDocuments = vi.fn();
const UserFindById = vi.fn();

vi.mock("../../models/BotTemplate.js", () => ({
  BotTemplate: {
    find: (...args: unknown[]) => BotTemplateFind(...args),
    findOne: (...args: unknown[]) => BotTemplateFindOne(...args),
    findById: (...args: unknown[]) => BotTemplateFindById(...args),
    findByIdAndDelete: vi.fn(),
    countDocuments: (...args: unknown[]) => BotTemplateCountDocuments(...args),
    create: vi.fn(),
  },
}));

vi.mock("../../models/Bot.js", () => ({
  Bot: { aggregate: vi.fn(() => Promise.resolve([])) },
}));

vi.mock("../../models/User.js", () => ({
  User: { findById: (...args: unknown[]) => UserFindById(...args) },
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn(() => ({ userId: mockUserId })) },
}));

vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network disabled in tests"))));

let botTemplatesRouter: typeof import("../bot-templates.js")["default"];
let errorHandler: typeof import("../../lib/errors.js")["errorHandler"];

beforeAll(async () => {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  ({ default: botTemplatesRouter } = await import("../bot-templates.js"));
  ({ errorHandler } = await import("../../lib/errors.js"));
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/bot-templates", botTemplatesRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  UserFindById.mockReturnValue({ lean: () => Promise.resolve({ email: "admin@example.com" }) });
});

describe("GET /api/bot-templates", () => {
  it("returns a structured 500 when the database call fails", async () => {
    BotTemplateFind.mockReturnValue({ sort: () => ({ lean: () => Promise.reject(new Error("db down")) }) });

    const res = await request(buildApp()).get("/api/bot-templates");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Server error" });
  });
});

describe("GET /api/bot-templates/slug/:slug", () => {
  it("returns a structured 500 when the database call fails", async () => {
    BotTemplateFindOne.mockReturnValue({ lean: () => Promise.reject(new Error("db down")) });

    const res = await request(buildApp()).get("/api/bot-templates/slug/some-bot-1234");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Server error" });
  });
});

describe("POST /api/bot-templates", () => {
  it("returns a structured 500 when the database call fails", async () => {
    BotTemplateCountDocuments.mockRejectedValue(new Error("db down"));

    const res = await request(buildApp())
      .post("/api/bot-templates")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "Test Bot",
        githubRepo: "https://github.com/example/bot",
        sessionIdUrl: "https://example.com/session",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Server error" });
  });
});

describe("DELETE /api/bot-templates/:id", () => {
  it("returns a structured 500 when the database call fails", async () => {
    BotTemplateFindById.mockRejectedValue(new Error("db down"));

    const res = await request(buildApp())
      .delete("/api/bot-templates/507f1f77bcf86cd799439099")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Server error" });
  });
});

describe("POST /api/bot-templates/:id/refresh-image", () => {
  it("returns a structured 500 when the database call fails", async () => {
    BotTemplateFindById.mockRejectedValue(new Error("db down"));

    const res = await request(buildApp())
      .post("/api/bot-templates/507f1f77bcf86cd799439099/refresh-image")
      .set("Authorization", "Bearer admin-token");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Server error" });
  });
});