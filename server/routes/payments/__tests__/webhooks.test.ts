import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const TransactionFindOne = vi.fn();
const UserFindById = vi.fn();

vi.mock("../../../models/Transaction.js", () => ({
  Transaction: { findOne: (...args: unknown[]) => TransactionFindOne(...args) },
}));

vi.mock("../../../models/User.js", () => ({
  User: { findById: (...args: unknown[]) => UserFindById(...args) },
}));

const verifyWebhookSignature = vi.fn();
const verifyWebhookSignatureNg = vi.fn();

vi.mock("../../../services/paystack.js", () => ({
  verifyWebhookSignature: (...args: unknown[]) => verifyWebhookSignature(...args),
  verifyWebhookSignatureNg: (...args: unknown[]) => verifyWebhookSignatureNg(...args),
}));

const isWonyaCallbackSuccess = vi.fn();

vi.mock("../../../services/wonyapay.js", () => ({
  isWonyaCallbackSuccess: (...args: unknown[]) => isWonyaCallbackSuccess(...args),
}));

vi.mock("../../../services/notify.js", () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../services/notifications.js", () => ({
  createNotification: vi.fn(() => Promise.resolve()),
}));

import {
  paystackWebhookHandler,
  speedpesaWebhookHandler,
  wonyaWebhookHandler,
} from "../webhooks.js";
import { errorHandler } from "../../../lib/errors.js";

function buildApp(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post("/webhook", handler);
  app.use(errorHandler);
  return app;
}

function fakeTx(overrides: Record<string, unknown> = {}) {
  return {
    _id: "tx1",
    userId: "user1",
    status: "pending",
    txAmount: 50,
    ksAmount: 250,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: "user1",
    email: "buyer@example.com",
    txCoins: 10,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("paystackWebhookHandler", () => {
  it("returns 400 when the signature header is missing", async () => {
    const res = await request(buildApp(paystackWebhookHandler))
      .post("/webhook")
      .send({ event: "charge.success", data: { reference: "ref1" } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing signature" });
    expect(TransactionFindOne).not.toHaveBeenCalled();
  });

  it("returns 400 when neither Kenya nor Nigeria signature verification passes", async () => {
    verifyWebhookSignature.mockReturnValue(false);
    verifyWebhookSignatureNg.mockReturnValue(false);

    const res = await request(buildApp(paystackWebhookHandler))
      .post("/webhook")
      .set("x-paystack-signature", "bad-signature")
      .send({ event: "charge.success", data: { reference: "ref1" } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid signature" });
    expect(TransactionFindOne).not.toHaveBeenCalled();
  });

  it("credits the user and marks the transaction successful on a valid Kenya signature", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    verifyWebhookSignatureNg.mockReturnValue(false);
    const tx = fakeTx();
    const user = fakeUser();
    TransactionFindOne.mockResolvedValue(tx);
    UserFindById.mockResolvedValue(user);

    const res = await request(buildApp(paystackWebhookHandler))
      .post("/webhook")
      .set("x-paystack-signature", "good-signature")
      .send({ event: "charge.success", data: { reference: "ref1" } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(tx.status).toBe("success");
    expect(tx.save).toHaveBeenCalledTimes(1);
    expect(user.txCoins).toBe(60);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it("does not double-credit a transaction that is already marked successful", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    verifyWebhookSignatureNg.mockReturnValue(false);
    const tx = fakeTx({ status: "success" });
    TransactionFindOne.mockResolvedValue(tx);

    const res = await request(buildApp(paystackWebhookHandler))
      .post("/webhook")
      .set("x-paystack-signature", "good-signature")
      .send({ event: "charge.success", data: { reference: "ref1" } });

    expect(res.status).toBe(200);
    expect(tx.save).not.toHaveBeenCalled();
    expect(UserFindById).not.toHaveBeenCalled();
  });

  it("ignores events other than charge.success", async () => {
    verifyWebhookSignature.mockReturnValue(true);
    verifyWebhookSignatureNg.mockReturnValue(false);

    const res = await request(buildApp(paystackWebhookHandler))
      .post("/webhook")
      .set("x-paystack-signature", "good-signature")
      .send({ event: "charge.failed", data: { reference: "ref1" } });

    expect(res.status).toBe(200);
    expect(TransactionFindOne).not.toHaveBeenCalled();
  });
});

describe("speedpesaWebhookHandler", () => {
  it("credits the user when the PAYIN event succeeds for a pending order", async () => {
    const tx = fakeTx({ ksAmount: 15000 });
    const user = fakeUser();
    TransactionFindOne.mockResolvedValue(tx);
    UserFindById.mockResolvedValue(user);

    const res = await request(buildApp(speedpesaWebhookHandler))
      .post("/webhook")
      .send({ event: "PAYIN", status: "SUCCESS", reference: "tz-ref-1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(tx.status).toBe("success");
    expect(user.txCoins).toBe(60);
  });

  it("leaves the transaction untouched on a failed PAYIN event", async () => {
    const res = await request(buildApp(speedpesaWebhookHandler))
      .post("/webhook")
      .send({ event: "PAYIN", status: "FAILED", reference: "tz-ref-1" });

    expect(res.status).toBe(200);
    expect(TransactionFindOne).not.toHaveBeenCalled();
  });
});

describe("wonyaWebhookHandler", () => {
  it("credits the user when the callback reports success for a pending order", async () => {
    isWonyaCallbackSuccess.mockReturnValue(true);
    const tx = fakeTx();
    const user = fakeUser();
    TransactionFindOne.mockResolvedValue(tx);
    UserFindById.mockResolvedValue(user);

    const res = await request(buildApp(wonyaWebhookHandler))
      .post("/webhook")
      .send({ RefTransa: "drc-ref-1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(tx.status).toBe("success");
    expect(user.txCoins).toBe(60);
  });

  it("still responds 200 when the callback reports failure, without crediting anyone", async () => {
    isWonyaCallbackSuccess.mockReturnValue(false);

    const res = await request(buildApp(wonyaWebhookHandler))
      .post("/webhook")
      .send({ RefTransa: "drc-ref-1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(TransactionFindOne).not.toHaveBeenCalled();
  });

  it("always responds 200 even if a downstream lookup throws", async () => {
    isWonyaCallbackSuccess.mockReturnValue(true);
    TransactionFindOne.mockRejectedValue(new Error("db down"));

    const res = await request(buildApp(wonyaWebhookHandler))
      .post("/webhook")
      .send({ RefTransa: "drc-ref-1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});
