import { describe, it, expect } from "vitest";

function cleanPhone(raw: string): string {
  return String(raw || "").replace(/[^\d]/g, "");
}

describe("cleanPhone", () => {
  it("strips plus spaces and dashes", () => {
    expect(cleanPhone("+254 712 345 678")).toBe("254712345678");
    expect(cleanPhone("254-712-345678")).toBe("254712345678");
  });

  it("handles empty input", () => {
    expect(cleanPhone("")).toBe("");
    expect(cleanPhone("abc")).toBe("");
  });
});
