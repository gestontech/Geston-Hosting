import { describe, it, expect, beforeAll } from "vitest";

let JWT_SECRET: string;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret-value";
  ({ JWT_SECRET } = await import("../env.js"));
});

describe("JWT_SECRET", () => {
  it("reads the value from process.env", () => {
    expect(JWT_SECRET).toBe("test-secret-value");
  });
});
