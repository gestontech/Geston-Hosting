import { describe, it, expect, beforeEach, vi } from "vitest";

const findOne = vi.fn();
const findOneAndUpdate = vi.fn();
const updateMany = vi.fn();

vi.mock("../../models/WaContact.js", () => ({
  WaContact: {
    findOne: (...args: unknown[]) => findOne(...args),
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
    updateMany: (...args: unknown[]) => updateMany(...args),
  },
}));

vi.mock("../notify.js", () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
}));

vi.mock("../whatsappSend.js", () => ({
  sendWaText: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("../../logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../../lib/waIdentity.js", () => ({
  resolvePhoneNumber: (jid: string) => String(jid || "").split("@")[0].replace(/\D/g, ""),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
  findOneAndUpdate.mockResolvedValue(undefined);
  updateMany.mockResolvedValue({ matchedCount: 1 });
});

describe("cleanWaPhone", () => {
  it("strips non-digits and jid suffix", async () => {
    const { cleanWaPhone } = await import("../waSecurity.js");
    expect(cleanWaPhone("+254 712-345-678")).toBe("254712345678");
    expect(cleanWaPhone("254712345678@s.whatsapp.net")).toBe("254712345678");
  });
});

describe("evaluateAbuse", () => {
  it("allows normal support messages", async () => {
    const { evaluateAbuse } = await import("../waSecurity.js");
    expect(evaluateAbuse("How do I buy a panel?", "254700000001@s.whatsapp.net")).toEqual({
      abuse: false,
    });
    expect(evaluateAbuse("ok", "jid")).toEqual({ abuse: false });
    expect(evaluateAbuse("menu", "jid")).toEqual({ abuse: false });
  });

  it("flags clear bad words", async () => {
    const { evaluateAbuse } = await import("../waSecurity.js");
    const v = evaluateAbuse("you fucking suck", "254700000099@s.whatsapp.net");
    expect(v.abuse).toBe(true);
    if (v.abuse) expect(v.reason).toBe("bad_word");
  });

  it("flags bot insults", async () => {
    const { evaluateAbuse } = await import("../waSecurity.js");
    const v = evaluateAbuse("this bot is stupid and useless", "254700000099@s.whatsapp.net");
    expect(v.abuse).toBe(true);
    if (v.abuse) expect(v.reason).toBe("bot_insult");
  });

  it("flags malware/scam patterns", async () => {
    const { evaluateAbuse } = await import("../waSecurity.js");
    const v = evaluateAbuse("claim free nitro here bit.ly/xxx", "254700000099@s.whatsapp.net");
    expect(v.abuse).toBe(true);
    if (v.abuse) expect(v.reason).toBe("malware_spam");
  });
});

describe("unbanWaContact", () => {
  it("rejects short or empty numbers", async () => {
    const { unbanWaContact } = await import("../waSecurity.js");
    const bad = await unbanWaContact("123");
    expect(bad.ok).toBe(false);
    expect(bad.message).toMatch(/Invalid number/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("cleans phone input and updates DB", async () => {
    const { unbanWaContact } = await import("../waSecurity.js");
    const result = await unbanWaContact("+254 712 345 678");
    expect(result.ok).toBe(true);
    expect(result.phone).toBe("254712345678");
    expect(result.message).toMatch(/Unbanned/);
    expect(updateMany).toHaveBeenCalled();
  });

  it("calls Baileys unblock when sock is provided", async () => {
    const updateBlockStatus = vi.fn().mockResolvedValue(undefined);
    const { unbanWaContact } = await import("../waSecurity.js");
    const result = await unbanWaContact("254712345678", { updateBlockStatus });
    expect(result.ok).toBe(true);
    expect(updateBlockStatus).toHaveBeenCalledWith("254712345678@s.whatsapp.net", "unblock");
    expect(result.message).toMatch(/WhatsApp unblock sent/);
  });

  it("still succeeds when Baileys unblock fails", async () => {
    const updateBlockStatus = vi.fn().mockRejectedValue(new Error("offline"));
    const { unbanWaContact } = await import("../waSecurity.js");
    const result = await unbanWaContact("254712345678", { updateBlockStatus });
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/skipped|unavailable/i);
  });
});

describe("isContactBlocked", () => {
  it("returns false when no blocked row", async () => {
    findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) });
    const { isContactBlocked } = await import("../waSecurity.js");
    expect(await isContactBlocked("254700000001@s.whatsapp.net")).toBe(false);
  });

  it("returns true when contact is blocked", async () => {
    findOne.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ isBlocked: true }) }),
    });
    const { isContactBlocked } = await import("../waSecurity.js");
    expect(await isContactBlocked("254700000001@s.whatsapp.net")).toBe(true);
  });
});
