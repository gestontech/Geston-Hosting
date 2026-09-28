import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContent = vi.fn();
const chatCompletionsCreate = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: (...args: unknown[]) => generateContent(...args),
    },
  })),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => chatCompletionsCreate(...args),
      },
    },
  })),
}));

vi.mock("../../services/notify.js", () => ({
  notifyOwner: vi.fn(() => Promise.resolve()),
  notifyOwnerCritical: vi.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  vi.clearAllMocks();

  vi.stubEnv("GEMINI_API_KEY", "gkey1,gkey2");
  vi.stubEnv("GROQ_API_KEY", "qkey1");

  vi.resetModules();
});

describe("askAI", () => {
  it("returns the Gemini response when the first key succeeds", async () => {
    generateContent.mockResolvedValue({
      text: "Hello from Gemini",
    });

    const { askAI } = await import("../ai.js");

    const result = await askAI("hi", "system prompt");

    expect(result).toBe("Hello from Gemini");
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("rotates to the second Gemini key when the first fails", async () => {
    generateContent
      .mockRejectedValueOnce(new Error("quota exceeded"))
      .mockResolvedValueOnce({
        text: "Hello from second key",
      });

    const { askAI } = await import("../ai.js");

    const result = await askAI("hi", "system prompt");

    expect(result).toBe("Hello from second key");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("falls back to Groq when every Gemini key fails", async () => {
    generateContent.mockRejectedValue(
      new Error("quota exceeded"),
    );

    chatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Hello from Groq",
          },
        },
      ],
    });

    const { askAI } = await import("../ai.js");

    const result = await askAI("hi", "system prompt");

    expect(result).toBe("Hello from Groq");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("notifies the owner and returns a safe fallback when everything fails", async () => {
    generateContent.mockRejectedValue(
      new Error("quota exceeded"),
    );

    chatCompletionsCreate.mockRejectedValue(
      new Error("quota exceeded"),
    );

    const { notifyOwnerCritical } =
      await import("../../services/notify.js");

    const { askAI } = await import("../ai.js");

    const result = await askAI("hi", "system prompt");

    expect(result).toMatch(/having trouble/i);

    expect(notifyOwnerCritical).toHaveBeenCalled();

    expect(notifyOwnerCritical).toHaveBeenCalledWith(
      expect.stringContaining("every Gemini and Groq"),
    );
  });
});

describe("parseAIReply", () => {
  it("strips the live-agent marker and flags it", async () => {
    const { parseAIReply } = await import("../ai.js");

    const result = parseAIReply(
      "Sure, connecting you now.\n[[REQUEST_LIVE_AGENT]]",
    );

    expect(result.requestLiveAgent).toBe(true);
    expect(result.text).toBe(
      "Sure, connecting you now.",
    );
  });

  it("extracts a valid deploy request", async () => {
    const { parseAIReply } = await import("../ai.js");

    const raw =
      'Deploying now.\n[[DEPLOY_BOT:{"appName":"myapp","sessionVar":"abc123","device":"android","isTrial":false,"months":1}]]';

    const result = parseAIReply(raw);

    expect(result.deployRequest).toEqual({
      appName: "myapp",
      sessionVar: "abc123",
      device: "android",
      isTrial: false,
      months: 1,
    });

    expect(result.text).toBe(
      "Deploying now.",
    );
  });

  it("ignores malformed deploy markers instead of throwing", async () => {
    const { parseAIReply } = await import("../ai.js");

    const result = parseAIReply(
      "Oops.\n[[DEPLOY_BOT:{not valid json}]]",
    );

    expect(result.deployRequest).toBeNull();
  });

  it("passes through plain text untouched", async () => {
    const { parseAIReply } = await import("../ai.js");

    const result = parseAIReply(
      "Just a normal reply.",
    );

    expect(result).toEqual({
      text: "Just a normal reply.",
      requestLiveAgent: false,
      deployRequest: null,
      ownerAdminRequest: null,
    });
  });
});
