import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockUserId = "507f1f77bcf86cd799439011";
const authState = { viaApiKey: false };

vi.mock("../../../middleware/sessionOrApiKey.js", () => ({
  sessionOrApiKeyGuard: (req: any, _res: any, next: any) => {
    req.user = { _id: mockUserId };
    req.viaApiKey = authState.viaApiKey;
    next();
  },
}));

vi.mock("../../../middleware/banCheck.js", () => ({
  banCheck: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../../middleware/rateLimit.js", () => ({
  paymentRateLimit: (_req: any, _res: any, next: any) => next(),
}));

const UserFindById = vi.fn();
const BoostOrderCreate = vi.fn();

vi.mock("../../../models/User.js", () => ({
  User: { findById: (...args: unknown[]) => UserFindById(...args) },
}));

vi.mock("../../../models/BoostOrder.js", () => ({
  BoostOrder: {
    create: (...args: unknown[]) => BoostOrderCreate(...args),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

const TransactionCreate = vi.fn();

vi.mock("../../../models/Transaction.js", () => ({
  Transaction: { create: (...args: unknown[]) => TransactionCreate(...args) },
}));

const createNotification = vi.fn();
const placeProviderOrder = vi.fn();
const getCachedServiceById = vi.fn();
const sellPriceKesPer1000 = vi.fn((base: number) => base);

vi.mock("../../../services/notifications.js", () => ({
  createNotification: (...args: unknown[]) => createNotification(...args),
}));

vi.mock("../../../services/notify.js", () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../services/boostProvider.js", () => ({
  placeProviderOrder: (...args: unknown[]) => placeProviderOrder(...args),
  getProviderOrderStatus: vi.fn(),
}));

vi.mock("../../../services/boostCatalogSync.js", () => ({
  getCachedServiceById: (...args: unknown[]) => getCachedServiceById(...args),
}));

vi.mock("../../../utils/boostStatus.js", () => ({
  normalizeBoostStatus: vi.fn((s: string) => s),
  countsAsCompleted: vi.fn(() => false),
}));

vi.mock("../../../utils/boostPricing.js", () => ({
  sellPriceKesPer1000: (...args: [number]) => sellPriceKesPer1000(...args),
}));

import ordersRouter from "../orders.js";
import { errorHandler } from "../../../lib/errors.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/boost", ordersRouter);
  app.use(errorHandler);
  return app;
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: mockUserId,
    txCoins: 100,
    isModerator: true,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function fakeService(overrides: Record<string, unknown> = {}) {
  return {
    providerId: 555,
    provider: "prov1",
    name: "IG Followers",
    category: "instagram",
    baseKesPer1000: 1000,
    min: 10,
    max: 10000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.viaApiKey = false;
  sellPriceKesPer1000.mockImplementation((base: number) => base);
  BoostOrderCreate.mockImplementation(async (doc: Record<string, unknown>) => ({
    ...doc,
    save: vi.fn().mockResolvedValue(undefined),
  }));
});

describe("POST /api/boost/order", () => {
  it("rejects Coins payment for non-moderators without an API key", async () => {
    UserFindById.mockResolvedValue(fakeUser({ isModerator: false }));

    const res = await request(buildApp())
      .post("/api/boost/order")
      .send({ serviceId: 1, link: "https://instagram.com/x", quantity: 100 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("TX_NOT_ALLOWED");
    expect(getCachedServiceById).not.toHaveBeenCalled();
  });

  it("returns 404 when the service does not exist", async () => {
    UserFindById.mockResolvedValue(fakeUser());
    getCachedServiceById.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/api/boost/order")
      .send({ serviceId: 1, link: "https://instagram.com/x", quantity: 100 });

    expect(res.status).toBe(404);
  });

  it("rejects a quantity outside the service's min/max", async () => {
    UserFindById.mockResolvedValue(fakeUser());
    getCachedServiceById.mockResolvedValue(fakeService({ min: 100, max: 500 }));

    const res = await request(buildApp())
      .post("/api/boost/order")
      .send({ serviceId: 1, link: "https://instagram.com/x", quantity: 50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/between 100 and 500/);
  });

  it("returns 402 with balance details when Coins is insufficient", async () => {
    UserFindById.mockResolvedValue(fakeUser({ txCoins: 5 }));
    getCachedServiceById.mockResolvedValue(fakeService());

    const res = await request(buildApp())
      .post("/api/boost/order")
      .send({ serviceId: 1, link: "https://instagram.com/x", quantity: 100 });

    expect(res.status).toBe(402);
    expect(res.body).toEqual(
      expect.objectContaining({ code: "INSUFFICIENT_COINS", requiredTx: 20, balanceTx: 5, shortfallTx: 15 })
    );
    expect(BoostOrderCreate).not.toHaveBeenCalled();
  });

  it("places the order, deducts Coins, and logs a transaction on success", async () => {
    const user = fakeUser({ txCoins: 100 });
    UserFindById.mockResolvedValue(user);
    getCachedServiceById.mockResolvedValue(fakeService());
    placeProviderOrder.mockResolvedValue({ order_id: "pid1", status: "processing" });

    const res = await request(buildApp())
      .post("/api/boost/order")
      .send({ serviceId: 1, link: "https://instagram.com/x", quantity: 100 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.order.costTx).toBe(20);
    expect(user.txCoins).toBe(80);
    expect(TransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "boost", txAmount: 20 })
    );
  });

  it("refunds Coins and marks the order refunded if the provider rejects it", async () => {
    const user = fakeUser({ txCoins: 100 });
    UserFindById.mockResolvedValue(user);
    getCachedServiceById.mockResolvedValue(fakeService());
    placeProviderOrder.mockRejectedValue(new Error("provider offline"));

    const res = await request(buildApp())
      .post("/api/boost/order")
      .send({ serviceId: 1, link: "https://instagram.com/x", quantity: 100 });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/provider offline/);
    expect(user.txCoins).toBe(100);
    expect(createNotification).toHaveBeenCalledWith(
      mockUserId, "refund", expect.any(String), expect.stringContaining("refunded")
    );
  });

  it("allows Coins payment via API key even for a non-moderator", async () => {
    authState.viaApiKey = true;
    UserFindById.mockResolvedValue(fakeUser({ isModerator: false, txCoins: 100 }));
    getCachedServiceById.mockResolvedValue(fakeService());
    placeProviderOrder.mockResolvedValue({ order_id: "pid1", status: "processing" });

    const res = await request(buildApp())
      .post("/api/boost/order")
      .send({ serviceId: 1, link: "https://instagram.com/x", quantity: 100 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
