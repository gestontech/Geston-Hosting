import { describe, it, expect } from "vitest";
import { formatDate, NAV_ITEMS } from "../shared";

describe("admin shared", () => {
  it("formatDate returns a readable string", () => {
    const s = formatDate("2026-01-15T12:00:00.000Z");
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(5);
  });

  it("NAV_ITEMS covers core tabs", () => {
    const keys = NAV_ITEMS.map(n => n.key);
    expect(keys).toContain("overview");
    expect(keys).toContain("config");
    expect(keys).toContain("users");
    expect(NAV_ITEMS.length).toBeGreaterThanOrEqual(15);
  });
});
