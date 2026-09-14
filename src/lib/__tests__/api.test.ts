import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();

describe("api helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "test-token"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("login sends correct payload", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ token: "abc", user: { id: "1" } }),
    });
    const { login } = await import("../api.js");
    const result = await login("user@test.com", "secret");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: "user@test.com", password: "secret" }),
      })
    );
    expect(result).toEqual({ token: "abc", user: { id: "1" } });
  });

  it("signup includes optional referral and fingerprint", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ ok: true }),
    });
    const { signup } = await import("../api.js");
    await signup("a@b.com", "alice", "pass", "REF123", "fp-xyz");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/signup"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "a@b.com",
          username: "alice",
          password: "pass",
          referralCode: "REF123",
          fingerprint: "fp-xyz",
        }),
      })
    );
  });
});
