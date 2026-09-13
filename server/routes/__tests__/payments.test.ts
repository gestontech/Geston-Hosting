import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";

const mockUserId = "507f1f77bcf86cd799439011";
const mockPackageId = "507f1f77bcf86cd799439022";

vi.mock("../../middleware/auth.js", () => ({
  authGuard: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = {
      _id: mockUserId,
      email: "payer@example.com",
      isBanned: false,
    };
    next();
  },
}));

vi.mock("../../middleware/banCheck.js", () => ({
  banCheck: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock("../../middleware/rateLimit.js", () => ({
  paymentRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
  authRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
  signupRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
  publicApiRateLimit: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const PackageFindById = vi.fn();
const UserFindById = vi.fn();
const TransactionCreate = vi.fn();

const PackageFind = vi.fn();

vi.mock("../../models/Package.js", () => ({
  Package: {
    findById: (...args: unknown[]) => PackageFindById(...args),
    find: (...args: unknown[]) => PackageFind(...args),
  },
}));

vi.mock("../../models/User.js", () => ({
  User: { findById: (...args: unknown[]) => UserFindById(...args) },
}));

vi.mock("../../models/Transaction.js", () => ({
  Transaction: {
    create: (...args: unknown[]) => TransactionCreate(...args),
    findOne: vi.fn(),
  },
}));

const initializeTransaction = vi.fn();
const initializeTransactionNg = vi.fn();

vi.mock("../../services/paystack.js", () => ({
  initializeTransaction: (...args: unknown[]) => initializeTransaction(...args),
  initializeTransactionNg: (...args: unknown[]) => initializeTransactionNg(...args),
  verifyWebhookSignature: vi.fn(() => false),
  verifyWebhookSignatureNg: vi.fn(() => false),
  verifyTransaction: vi.fn(),
  verifyTransactionNg: vi.fn(),
  chargeMobileMoney: vi.fn(),
  getChargeStatus: vi.fn(),
  normalizePhone: (p: string) => p,
  PAYSTACK_PUBLIC_KEY: "pk_test",
  getNigeriaPublicKey: () => "",
  isNigeriaAvailable: () => false,
}));

vi.mock("../../services/fapshi.js", () => ({
  isCameroonAvailable: () => false,
  initiateFapshiDirectPay: vi.fn(),
  initiateFapshiPayment: vi.fn(),
  getFapshiPaymentStatus: vi.fn(),
}));

vi.mock("../../services/speedpesa.js", () => ({
  isTanzaniaAvailable: () => false,
  initiateSpeedPesaPayment: vi.fn(),
  getSpeedPesaPaymentStatus: vi.fn(),
}));

vi.mock("../../services/wonyapay.js", () => ({
  isDRCAvailable: () => false,
  initiateWonyaPayment: vi.fn(),
  getWonyaPaymentStatus: vi.fn(),
  normalizeDRCPhone: (p: string) => p,
  isWonyaCallbackSuccess: () => false,
}));

vi.mock("../../services/notify.js", () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../services/notifications.js", () => ({
  createNotification: vi.fn(() => Promise.resolve()),
}));

import paymentsRouter from "../payments.js";
import { errorHandler } from "../../lib/errors.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/payments", paymentsRouter);
  app.use(errorHandler);
  return app;
}

describe("POST /api/payments/initiate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UserFindById.mockResolvedValue({
      _id: mockUserId,
      email: "payer@example.com",
      txCoins: 0,
    });
    TransactionCreate.mockResolvedValue({});
  });

  it("returns 400 when packageId is missing", async () => {
    const res = await request(buildApp())
      .post("/api/payments/initiate")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid input" });
    expect(PackageFindById).not.toHaveBeenCalled();
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("returns 400 when packageId is not a string", async () => {
    const res = await request(buildApp())
      .post("/api/payments/initiate")
      .send({ packageId: 12345 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid input" });
  });

  it("returns 404 when package does not exist", async () => {
    PackageFindById.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/api/payments/initiate")
      .send({ packageId: mockPackageId });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Package not found" });
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("returns 404 when user is missing", async () => {
    PackageFindById.mockResolvedValue({
      _id: mockPackageId,
      ksPrice: 100,
      txAmount: 50,
      bonusTx: 20,
    });
    UserFindById.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/api/payments/initiate")
      .send({ packageId: mockPackageId });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });

  it("returns authorizationUrl on success", async () => {
    PackageFindById.mockResolvedValue({
      _id: { toString: () => mockPackageId },
      ksPrice: 100,
      txAmount: 50,
      bonusTx: 20,
    });
    initializeTransaction.mockResolvedValue({
      success: true,
      authorizationUrl: "https://paystack.test/auth",
      accessCode: "ACCESS_CODE",
    });

    const res = await request(buildApp())
      .post("/api/payments/initiate")
      .send({ packageId: mockPackageId });

    expect(res.status).toBe(200);
    expect(res.body.authorizationUrl).toBe("https://paystack.test/auth");
    expect(res.body.accessCode).toBe("ACCESS_CODE");
    expect(res.body.reference).toMatch(/^TX_/);
    expect(initializeTransaction).toHaveBeenCalledOnce();
    expect(TransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "topup",
        txAmount: 70,
        ksAmount: 100,
        status: "pending",
        paystackCountry: "kenya",
      })
    );
  });

  it("returns 500 when Paystack initialization fails", async () => {
    PackageFindById.mockResolvedValue({
      _id: { toString: () => mockPackageId },
      ksPrice: 100,
      txAmount: 50,
      bonusTx: 0,
    });
    initializeTransaction.mockResolvedValue({ success: false });

    const res = await request(buildApp())
      .post("/api/payments/initiate")
      .send({ packageId: mockPackageId });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to initialize payment" });
    expect(TransactionCreate).not.toHaveBeenCalled();
  });
});

describe("GET /api/payments/packages", () => {
  it("returns active packages sorted by order", async () => {
    const lean = vi.fn().mockResolvedValue([
      { name: "Starter", ksPrice: 30, order: 1 },
    ]);
    const sort = vi.fn().mockReturnValue({ lean });
    PackageFind.mockReturnValue({ sort });

    const res = await request(buildApp()).get("/api/payments/packages");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: "Starter", ksPrice: 30, order: 1 }]);
    expect(PackageFind).toHaveBeenCalledWith({ active: true });
    expect(sort).toHaveBeenCalledWith({ order: 1 });
  });
});

describe("GET /api/payments/config", () => {
  it("returns public payment configuration", async () => {
    const res = await request(buildApp()).get("/api/payments/config");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("paystackPublicKey");
    expect(res.body).toHaveProperty("nigeriaAvailable");
    expect(res.body).toHaveProperty("cameroonAvailable");
    expect(res.body).toHaveProperty("tanzaniaAvailable");
    expect(res.body).toHaveProperty("drcAvailable");
  });
});
