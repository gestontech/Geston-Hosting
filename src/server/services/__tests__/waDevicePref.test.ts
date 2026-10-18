import { describe, it, expect, vi, beforeEach } from "vitest";

const findOne = vi.fn();

vi.mock("../../models/WaContact.js", () => ({
  WaContact: {
    findOne: (...args: unknown[]) => findOne(...args),
    findOneAndUpdate: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../../logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

function leanDoc(clientDevice: string | undefined) {
  return {
    select: () => ({
      lean: () => Promise.resolve(clientDevice ? { clientDevice } : null),
    }),
  };
}

describe("shouldSendInteractive", () => {
  it("returns false when device is unknown", async () => {
    findOne.mockReturnValue(leanDoc(undefined));
    const { shouldSendInteractive, clearDeviceCacheForTests } = await import(
      "../waDevicePref.js"
    );
    clearDeviceCacheForTests();
    expect(await shouldSendInteractive("254700000001@s.whatsapp.net")).toBe(false);
  });

  it("returns true only for stored android", async () => {
    findOne.mockReturnValue(leanDoc("android"));
    const { shouldSendInteractive, clearDeviceCacheForTests } = await import(
      "../waDevicePref.js"
    );
    clearDeviceCacheForTests();
    expect(await shouldSendInteractive("jid1")).toBe(true);
  });

  it("returns false for ios / web / desktop", async () => {
    for (const d of ["ios", "web", "desktop"] as const) {
      vi.resetModules();
      findOne.mockReturnValue(leanDoc(d));
      const { shouldSendInteractive, clearDeviceCacheForTests } = await import(
        "../waDevicePref.js"
      );
      clearDeviceCacheForTests();
      expect(await shouldSendInteractive("jid-" + d)).toBe(false);
    }
  });
});
