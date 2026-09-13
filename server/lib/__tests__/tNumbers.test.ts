import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("T_NUMBERS", "");
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getTNumbers / isTNumber", () => {
  it("returns empty list when T_NUMBERS is unset", async () => {
    const { getTNumbers, isTNumber } = await import("../tNumbers.js");
    expect(getTNumbers()).toEqual([]);
    expect(isTNumber("254712345678")).toBe(false);
  });

  it("parses comma-separated numbers and strips non-digits", async () => {
    vi.stubEnv("T_NUMBERS", "+254 712 345 678, 1-555-123-4567, short");
    vi.resetModules();
    const { getTNumbers } = await import("../tNumbers.js");
    const list = getTNumbers();
    expect(list).toContain("254712345678");
    expect(list).toContain("15551234567");
    // "short" has no digits long enough
    expect(list.every((n) => n.length >= 8)).toBe(true);
  });

  it("dedupes repeated numbers", async () => {
    vi.stubEnv("T_NUMBERS", "254700000001,254700000001,+254700000001");
    vi.resetModules();
    const { getTNumbers } = await import("../tNumbers.js");
    expect(getTNumbers()).toEqual(["254700000001"]);
  });

  it("matches plain phone, jid, and suffix variants", async () => {
    vi.stubEnv("T_NUMBERS", "254712345678");
    vi.resetModules();
    const { isTNumber } = await import("../tNumbers.js");
    expect(isTNumber("254712345678")).toBe(true);
    expect(isTNumber("254712345678@s.whatsapp.net")).toBe(true);
    expect(isTNumber("+254 712 345 678")).toBe(true);
    expect(isTNumber("999999999999")).toBe(false);
    expect(isTNumber("")).toBe(false);
  });

  it("rejects numbers shorter than 8 digits", async () => {
    vi.stubEnv("T_NUMBERS", "1234567,254712345678");
    vi.resetModules();
    const { getTNumbers, isTNumber } = await import("../tNumbers.js");
    expect(getTNumbers()).toEqual(["254712345678"]);
    expect(isTNumber("1234567")).toBe(false);
  });
});
