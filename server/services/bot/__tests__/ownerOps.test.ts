import { describe, it, expect, vi, beforeEach } from "vitest";

const UserFindOne = vi.fn();
const BotCountDocuments = vi.fn();
const PanelCountDocuments = vi.fn();
const TransactionCreate = vi.fn();
const TransactionCountDocuments = vi.fn();
const UserCountDocuments = vi.fn();

vi.mock("../../../models/User.js", () => ({
  User: {
    findOne: (...args: unknown[]) => UserFindOne(...args),
    countDocuments: (...args: unknown[]) => UserCountDocuments(...args),
  },
}));

vi.mock("../../../models/Bot.js", () => ({
  Bot: { countDocuments: (...args: unknown[]) => BotCountDocuments(...args) },
}));

vi.mock("../../../models/Panel.js", () => ({
  Panel: { countDocuments: (...args: unknown[]) => PanelCountDocuments(...args) },
}));

vi.mock("../../../models/Transaction.js", () => ({
  Transaction: {
    create: (...args: unknown[]) => TransactionCreate(...args),
    countDocuments: (...args: unknown[]) => TransactionCountDocuments(...args),
  },
}));

import {
  MAX_TX_PER_COMMAND,
  isValidEmail,
  parsePositiveTxAmount,
  ownerGrantTxByEmail,
  ownerSubtractTxByEmail,
  ownerLookupUserByEmail,
  ownerPlatformStats,
  parseOwnerAdminIntent,
  runOwnerAdminIntent,
} from "../ownerOps.js";

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: "u1",
    email: "buyer@example.com",
    txCoins: 10,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });
  it("rejects missing @ or domain", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });
  it("rejects an address over 254 chars", () => {
    const long = "a".repeat(250) + "@x.co";
    expect(isValidEmail(long)).toBe(false);
  });
});

describe("parsePositiveTxAmount", () => {
  it("accepts a positive whole number", () => {
    expect(parsePositiveTxAmount(50)).toBe(50);
    expect(parsePositiveTxAmount("1,000")).toBe(1000);
  });
  it("rejects zero, negative, non-integer, and non-numeric input", () => {
    expect(parsePositiveTxAmount(0)).toBeNull();
    expect(parsePositiveTxAmount(-5)).toBeNull();
    expect(parsePositiveTxAmount(1.5)).toBeNull();
    expect(parsePositiveTxAmount("abc")).toBeNull();
  });
  it("rejects an amount over the hard ceiling", () => {
    expect(parsePositiveTxAmount(MAX_TX_PER_COMMAND + 1)).toBeNull();
    expect(parsePositiveTxAmount(MAX_TX_PER_COMMAND)).toBe(MAX_TX_PER_COMMAND);
  });
});

describe("ownerGrantTxByEmail", () => {
  it("rejects an invalid email before touching the database", async () => {
    const result = await ownerGrantTxByEmail("not-an-email", 10, "test");
    expect(result.ok).toBe(false);
    expect(UserFindOne).not.toHaveBeenCalled();
  });

  it("rejects an amount over the ceiling before touching the database", async () => {
    const result = await ownerGrantTxByEmail("user@example.com", MAX_TX_PER_COMMAND + 1, "test");
    expect(result.ok).toBe(false);
    expect(UserFindOne).not.toHaveBeenCalled();
  });

  it("returns an error when no account matches the email", async () => {
    UserFindOne.mockResolvedValue(null);
    const result = await ownerGrantTxByEmail("nobody@example.com", 10, "test");
    expect(result).toEqual({ ok: false, error: "No account found for that email." });
  });

  it("grants Coins, saves the user, and records a traceable Transaction", async () => {
    const user = fakeUser({ txCoins: 10 });
    UserFindOne.mockResolvedValue(user);

    const result = await ownerGrantTxByEmail("buyer@example.com", 25, "tg:8282579769");

    expect(result.ok).toBe(true);
    expect(user.txCoins).toBe(35);
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(TransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        type: "admin_grant",
        txAmount: 25,
        status: "success",
        paystackRef: expect.stringContaining("owner_bot:tg:8282579769"),
      })
    );
  });
});

describe("ownerSubtractTxByEmail", () => {
  it("floors the balance at 0 rather than going negative", async () => {
    const user = fakeUser({ txCoins: 10 });
    UserFindOne.mockResolvedValue(user);

    const result = await ownerSubtractTxByEmail("buyer@example.com", 999, "test");

    expect(result.ok).toBe(true);
    expect(user.txCoins).toBe(0);
    expect(result.ok && result.message).toMatch(/Removed 10 Coins/);
  });

  it("subtracts normally when the balance covers it", async () => {
    const user = fakeUser({ txCoins: 50 });
    UserFindOne.mockResolvedValue(user);

    const result = await ownerSubtractTxByEmail("buyer@example.com", 20, "test");

    expect(result.ok).toBe(true);
    expect(user.txCoins).toBe(30);
  });

  it("rejects an invalid amount before touching the database", async () => {
    const result = await ownerSubtractTxByEmail("buyer@example.com", -5, "test");
    expect(result.ok).toBe(false);
    expect(UserFindOne).not.toHaveBeenCalled();
  });

  it("returns an error when no account matches the email", async () => {
    UserFindOne.mockResolvedValue(null);
    const result = await ownerSubtractTxByEmail("nobody@example.com", 10, "test");
    expect(result).toEqual({ ok: false, error: "No account found for that email." });
  });
});

describe("ownerLookupUserByEmail", () => {
  it("returns account details with bot/panel counts", async () => {
    UserFindOne.mockReturnValue({
      lean: () => Promise.resolve({
        email: "buyer@example.com", username: "buyer", txCoins: 42,
        isBanned: false, isModerator: true, createdAt: new Date("2026-01-01"),
      }),
    });
    BotCountDocuments.mockResolvedValue(3);
    PanelCountDocuments.mockResolvedValue(1);

    const result = await ownerLookupUserByEmail("buyer@example.com");

    expect(result.ok).toBe(true);
    expect(result.ok && result.message).toMatch(/Coins: 42/);
    expect(result.ok && result.message).toMatch(/Bots: 3/);
    expect(result.ok && result.message).toMatch(/Moderator: yes/);
  });

  it("returns an error when no account matches", async () => {
    UserFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const result = await ownerLookupUserByEmail("nobody@example.com");
    expect(result).toEqual({ ok: false, error: "No account found for that email." });
  });

  it("rejects an invalid email format", async () => {
    const result = await ownerLookupUserByEmail("not-an-email");
    expect(result.ok).toBe(false);
    expect(UserFindOne).not.toHaveBeenCalled();
  });
});

describe("ownerPlatformStats", () => {
  it("formats counts from all 4 models into one message", async () => {
    UserCountDocuments.mockResolvedValue(100);
    BotCountDocuments.mockResolvedValueOnce(40).mockResolvedValueOnce(55);
    PanelCountDocuments.mockResolvedValue(12);
    TransactionCountDocuments.mockResolvedValue(7);

    const text = await ownerPlatformStats();

    expect(text).toMatch(/Users: 100/);
    expect(text).toMatch(/Active bots: 40/);
    expect(text).toMatch(/Total bots: 55/);
    expect(text).toMatch(/Panels: 12/);
    expect(text).toMatch(/Payments \(24h\): 7/);
  });
});

describe("parseOwnerAdminIntent", () => {
  it("parses 'stats'", () => {
    expect(parseOwnerAdminIntent("stats")).toEqual({ action: "stats" });
  });
  it("parses '/addtx email amount'", () => {
    expect(parseOwnerAdminIntent("/addtx buyer@example.com 10")).toEqual({
      action: "grant", email: "buyer@example.com", amount: "10",
    });
  });
  it("parses natural language grant phrasing", () => {
    expect(parseOwnerAdminIntent("add 10 tx to buyer@example.com")).toEqual({
      action: "grant", amount: "10", email: "buyer@example.com",
    });
  });
  it("parses natural language subtract phrasing", () => {
    expect(parseOwnerAdminIntent("remove 5 tx from buyer@example.com")).toEqual({
      action: "subtract", amount: "5", email: "buyer@example.com",
    });
  });
  it("parses a lookup", () => {
    expect(parseOwnerAdminIntent("user buyer@example.com")).toEqual({
      action: "lookup", email: "buyer@example.com",
    });
  });
  it("returns null action for unrecognized text", () => {
    expect(parseOwnerAdminIntent("hello there, how are you?")).toEqual({ action: null });
  });
});

describe("runOwnerAdminIntent", () => {
  it("returns null when the text doesn't match any intent", async () => {
    const result = await runOwnerAdminIntent("hello there", "test");
    expect(result).toBeNull();
    expect(UserFindOne).not.toHaveBeenCalled();
  });

  it("executes a grant when the text matches", async () => {
    const user = fakeUser({ txCoins: 0 });
    UserFindOne.mockResolvedValue(user);

    const result = await runOwnerAdminIntent("/addtx buyer@example.com 15", "tg:owner");

    expect(result?.ok).toBe(true);
    expect(user.txCoins).toBe(15);
  });

  it("executes stats when the text is 'stats'", async () => {
    UserCountDocuments.mockResolvedValue(1);
    BotCountDocuments.mockResolvedValue(1);
    PanelCountDocuments.mockResolvedValue(1);
    TransactionCountDocuments.mockResolvedValue(1);

    const result = await runOwnerAdminIntent("stats", "tg:owner");

    expect(result?.ok).toBe(true);
    expect(result?.ok && result.message).toMatch(/Geston Host Stats/);
  });
});
