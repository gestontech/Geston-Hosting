import { describe, it, expect } from "vitest";
import {
  normalizeTanzaniaPhone,
  isValidTanzaniaPhone,
  normalizeDRCPhone,
  isValidDRCPhone,
  isValidKenyanPhone,
  toPaystackPhone,
} from "../phone";

describe("phone utils", () => {
  it("normalizes Tanzania phones", () => {
    expect(normalizeTanzaniaPhone("0712345678")).toBe("255712345678");
    expect(normalizeTanzaniaPhone("255712345678")).toBe("255712345678");
    expect(normalizeTanzaniaPhone("712345678")).toBe("255712345678");
  });

  it("validates Tanzania phones", () => {
    expect(isValidTanzaniaPhone("0712345678")).toBe(true);
    expect(isValidTanzaniaPhone("0612345678")).toBe(true);
    expect(isValidTanzaniaPhone("0512345678")).toBe(false);
    expect(isValidTanzaniaPhone("123")).toBe(false);
  });

  it("normalizes DRC phones", () => {
    expect(normalizeDRCPhone("0812345678")).toBe("243812345678");
    expect(normalizeDRCPhone("243812345678")).toBe("243812345678");
  });

  it("validates DRC phones", () => {
    expect(isValidDRCPhone("0812345678")).toBe(true);
    expect(isValidDRCPhone("0912345678")).toBe(true);
    expect(isValidDRCPhone("0712345678")).toBe(false);
  });

  it("validates Kenyan phones", () => {
    expect(isValidKenyanPhone("0712345678")).toBe(true);
    expect(isValidKenyanPhone("0112345678")).toBe(true);
    expect(isValidKenyanPhone("254712345678")).toBe(true);
    expect(isValidKenyanPhone("0212345678")).toBe(false);
  });

  it("converts to Paystack phone format", () => {
    expect(toPaystackPhone("0712345678")).toBe("254712345678");
    expect(toPaystackPhone("254712345678")).toBe("254712345678");
    expect(toPaystackPhone("712345678")).toBe("254712345678");
  });
});
