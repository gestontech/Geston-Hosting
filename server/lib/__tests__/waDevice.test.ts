import { describe, it, expect } from "vitest";
import {
  detectDeviceFromMessageId,
  canUseInteractiveButtons,
  deviceLabel,
} from "../waDevice.js";

describe("detectDeviceFromMessageId", () => {
  it("returns android for long message ids (>21)", () => {
    expect(detectDeviceFromMessageId("ABCDEFGHIJKLMNOPQRSTUVWX")).toBe("android");
    expect(detectDeviceFromMessageId("x".repeat(22))).toBe("android");
  });

  it("returns ios for ids starting with 3A", () => {
    expect(detectDeviceFromMessageId("3A1B2C3D4E5F")).toBe("ios");
    expect(detectDeviceFromMessageId("3A")).toBe("ios");
  });

  it("returns web for 3EB0 prefix and short non-3A ids", () => {
    expect(detectDeviceFromMessageId("3EB0ABC123")).toBe("web");
    expect(detectDeviceFromMessageId("SHORTID123")).toBe("web");
  });

  it("returns unknown for empty / null / bot-like ids", () => {
    expect(detectDeviceFromMessageId("")).toBe("unknown");
    expect(detectDeviceFromMessageId(null)).toBe("unknown");
    expect(detectDeviceFromMessageId(undefined)).toBe("unknown");
    expect(detectDeviceFromMessageId("BAE5ABCDEF123456")).toBe("unknown");
  });
});

describe("canUseInteractiveButtons", () => {
  it("returns true ONLY for android", () => {
    expect(canUseInteractiveButtons("android")).toBe(true);
  });

  it("returns false for ios, web, desktop, unknown, null, empty", () => {
    expect(canUseInteractiveButtons("ios")).toBe(false);
    expect(canUseInteractiveButtons("web")).toBe(false);
    expect(canUseInteractiveButtons("desktop")).toBe(false);
    expect(canUseInteractiveButtons("unknown")).toBe(false);
    expect(canUseInteractiveButtons(null)).toBe(false);
    expect(canUseInteractiveButtons(undefined)).toBe(false);
    expect(canUseInteractiveButtons("")).toBe(false);
    expect(canUseInteractiveButtons("ANDROID")).toBe(false); // case-sensitive
  });
});

describe("deviceLabel", () => {
  it("maps known devices to display labels", () => {
    expect(deviceLabel("android")).toBe("Android");
    expect(deviceLabel("ios")).toBe("iOS");
    expect(deviceLabel("web")).toBe("Web");
    expect(deviceLabel("desktop")).toBe("Desktop");
    expect(deviceLabel("unknown")).toBe("Unknown");
    expect(deviceLabel(null)).toBe("Unknown");
  });
});
