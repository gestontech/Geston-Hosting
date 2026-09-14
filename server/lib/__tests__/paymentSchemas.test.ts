import { describe, it, expect } from "vitest";
import {
  initiateSchema,
  initiateNgSchema,
  chargeSchema,
  chargeCustomSchema,
  verifySchema,
  prepareCardSchema,
  initiateCustomSchema,
} from "../paymentSchemas.js";

describe("payment schemas", () => {
  it("initiateSchema accepts valid packageId", () => {
    const r = initiateSchema.safeParse({ packageId: "abc123" });
    expect(r.success).toBe(true);
  });

  it("initiateSchema rejects missing packageId", () => {
    const r = initiateSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("initiateNgSchema accepts valid payload", () => {
    const r = initiateNgSchema.safeParse({
      ngnAmount: 1000,
      txAmount: 10,
      bonusTx: 0,
    });
    expect(r.success).toBe(true);
  });

  it("initiateNgSchema rejects ngnAmount below 100", () => {
    const r = initiateNgSchema.safeParse({
      ngnAmount: 50,
      txAmount: 1,
    });
    expect(r.success).toBe(false);
  });

  it("chargeSchema accepts mpesa and airtel", () => {
    expect(chargeSchema.safeParse({
      packageId: "p1",
      phone: "0712345678",
      provider: "mpesa",
    }).success).toBe(true);
    expect(chargeSchema.safeParse({
      packageId: "p1",
      phone: "0712345678",
      provider: "airtel",
    }).success).toBe(true);
  });

  it("chargeSchema rejects invalid provider", () => {
    const r = chargeSchema.safeParse({
      packageId: "p1",
      phone: "0712345678",
      provider: "visa",
    });
    expect(r.success).toBe(false);
  });

  it("chargeCustomSchema enforces min txAmount", () => {
    expect(chargeCustomSchema.safeParse({
      txAmount: 2,
      phone: "0712345678",
      provider: "mpesa",
    }).success).toBe(false);
    expect(chargeCustomSchema.safeParse({
      txAmount: 3,
      phone: "0712345678",
      provider: "mpesa",
    }).success).toBe(true);
  });

  it("verifySchema requires reference", () => {
    expect(verifySchema.safeParse({}).success).toBe(false);
    expect(verifySchema.safeParse({ reference: "TX_123" }).success).toBe(true);
  });

  it("prepareCardSchema requires packageId", () => {
    expect(prepareCardSchema.safeParse({}).success).toBe(false);
    expect(prepareCardSchema.safeParse({ packageId: "x" }).success).toBe(true);
  });

  it("initiateCustomSchema enforces mins", () => {
    expect(initiateCustomSchema.safeParse({ txAmount: 2 }).success).toBe(false);
    expect(initiateCustomSchema.safeParse({ txAmount: 5, ksAmount: 10 }).success).toBe(false);
    expect(initiateCustomSchema.safeParse({ txAmount: 5, ksAmount: 25 }).success).toBe(true);
  });
});
