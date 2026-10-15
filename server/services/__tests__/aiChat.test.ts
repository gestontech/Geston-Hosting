import { describe, it, expect, vi, beforeEach } from "vitest";

const askAI = vi.fn();
const parseAIReply = vi.fn();

vi.mock("../../lib/ai.js", () => ({
  askAI: (...args: unknown[]) => askAI(...args),
  parseAIReply: (...args: unknown[]) => parseAIReply(...args),
}));

const buildPromptContext = vi.fn();

vi.mock("../../lib/promptContext.js", () => ({
  buildPromptContext: (...args: unknown[]) => buildPromptContext(...args),
}));

const appendMemory = vi.fn();
const formatMemoryForPrompt = vi.fn();

vi.mock("../../lib/aiMemory.js", () => ({
  appendMemory: (...args: unknown[]) => appendMemory(...args),
  formatMemoryForPrompt: (...args: unknown[]) => formatMemoryForPrompt(...args),
}));

vi.mock("../../prompts/whatsappPrompt.js", () => ({
  buildWhatsAppPrompt: vi.fn(() => "whatsapp-system-prompt"),
}));
vi.mock("../../prompts/sitePrompt.js", () => ({
  buildSitePrompt: vi.fn(() => "site-system-prompt"),
}));

const notifyOwnerRoutine = vi.fn();

vi.mock("../notify.js", () => ({
  notifyOwnerRoutine: (...args: unknown[]) => notifyOwnerRoutine(...args),
}));

const ownerGrantTxByEmail = vi.fn();
const ownerSubtractTxByEmail = vi.fn();
const ownerLookupUserByEmail = vi.fn();
const ownerPlatformStats = vi.fn();

vi.mock("../bot/ownerOps.js", () => ({
  ownerGrantTxByEmail: (...args: unknown[]) => ownerGrantTxByEmail(...args),
  ownerSubtractTxByEmail: (...args: unknown[]) => ownerSubtractTxByEmail(...args),
  ownerLookupUserByEmail: (...args: unknown[]) => ownerLookupUserByEmail(...args),
  ownerPlatformStats: (...args: unknown[]) => ownerPlatformStats(...args),
}));

const deployBotForAdmin = vi.fn();

vi.mock("../ownerDeploy.js", () => ({
  deployBotForAdmin: (...args: unknown[]) => deployBotForAdmin(...args),
}));

const getDisabledServices = vi.fn();
const getDisabledPaymentMethods = vi.fn();
const setDisabledServices = vi.fn();
const setDisabledPaymentMethods = vi.fn();

vi.mock("../../lib/featureFlags.js", () => ({
  getDisabledServices: (...args: unknown[]) => getDisabledServices(...args),
  getDisabledPaymentMethods: (...args: unknown[]) => getDisabledPaymentMethods(...args),
  setDisabledServices: (...args: unknown[]) => setDisabledServices(...args),
  setDisabledPaymentMethods: (...args: unknown[]) => setDisabledPaymentMethods(...args),
}));

const unbanWaContact = vi.fn();

vi.mock("../waSecurity.js", () => ({
  unbanWaContact: (...args: unknown[]) => unbanWaContact(...args),
}));

vi.mock("../whatsappOwner.js", () => ({
  getActiveWaSock: vi.fn(() => null),
}));

import { runAIChat } from "../aiChat.js";

function baseParsed(overrides: Record<string, unknown> = {}) {
  return {
    text: "Here's a normal reply.",
    requestLiveAgent: false,
    deployRequest: null,
    ownerAdminRequest: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  buildPromptContext.mockResolvedValue({ isOwner: false, disabledServices: [], disabledPaymentMethods: [], pricing: {} });
  askAI.mockResolvedValue("raw ai response");
  getDisabledServices.mockResolvedValue([]);
  getDisabledPaymentMethods.mockResolvedValue([]);
});

describe("runAIChat — plain replies", () => {
  it("returns the parsed text untouched when there are no markers", async () => {
    parseAIReply.mockReturnValue(baseParsed());

    const result = await runAIChat({ surface: "whatsapp", message: "hi", isOwner: false });

    expect(result.text).toBe("Here's a normal reply.");
    expect(result.requestLiveAgent).toBe(false);
    expect(result.deployRequest).toBeNull();
  });

  it("truncates the outgoing message to 2000 chars", async () => {
    parseAIReply.mockReturnValue(baseParsed());
    const longMessage = "a".repeat(3000);

    await runAIChat({ surface: "whatsapp", message: longMessage, isOwner: false });

    expect(askAI.mock.calls[0][0].length).toBeLessThanOrEqual(2000);
  });
});

describe("runAIChat — live agent handoff", () => {
  it("notifies the owner via WhatsApp when the site surface requests a live agent", async () => {
    parseAIReply.mockReturnValue(baseParsed({ requestLiveAgent: true, text: "Connecting you now." }));

    await runAIChat({ surface: "site", message: "let me talk to a human", isOwner: false, userLabel: "site:abc" });

    expect(notifyOwnerRoutine).toHaveBeenCalledWith(expect.stringContaining("Live agent requested"));
  });

  it("does not notify for whatsapp surface (handled natively there)", async () => {
    parseAIReply.mockReturnValue(baseParsed({ requestLiveAgent: true }));

    await runAIChat({ surface: "whatsapp", message: "talk to the owner", isOwner: false });

    expect(notifyOwnerRoutine).not.toHaveBeenCalled();
  });
});

describe("runAIChat — owner-only deploy", () => {
  const deployMarker = { appName: "myapp", sessionVar: "abc123", device: "android" as const, isTrial: false, months: 1 };

  it("executes the deploy when isOwner is true", async () => {
    parseAIReply.mockReturnValue(baseParsed({ deployRequest: deployMarker, text: "On it." }));
    deployBotForAdmin.mockResolvedValue({ ok: true, message: "✅ Deployed myapp" });

    const result = await runAIChat({ surface: "whatsapp", message: "deploy myapp", isOwner: true, userLabel: "wa:owner" });

    expect(deployBotForAdmin).toHaveBeenCalledWith(expect.objectContaining({ appName: "myapp", sessionVar: "abc123" }));
    expect(result.text).toContain("Deployed myapp");
  });

  it("never calls deployBotForAdmin when isOwner is false, even if the marker is present", async () => {
    parseAIReply.mockReturnValue(baseParsed({ deployRequest: deployMarker }));

    const result = await runAIChat({ surface: "whatsapp", message: "deploy myapp", isOwner: false });

    expect(deployBotForAdmin).not.toHaveBeenCalled();
    expect(result.text).toBe("Here's a normal reply.");
  });

  it("returns a safe failure message if deployBotForAdmin throws", async () => {
    parseAIReply.mockReturnValue(baseParsed({ deployRequest: deployMarker }));
    deployBotForAdmin.mockRejectedValue(new Error("Heroku down"));

    const result = await runAIChat({ surface: "whatsapp", message: "deploy myapp", isOwner: true });

    expect(result.text).toMatch(/Deploy failed unexpectedly/);
  });

  it("returns the provider's error message when deploy fails cleanly", async () => {
    parseAIReply.mockReturnValue(baseParsed({ deployRequest: deployMarker }));
    deployBotForAdmin.mockResolvedValue({ ok: false, error: "No available teams" });

    const result = await runAIChat({ surface: "whatsapp", message: "deploy myapp", isOwner: true });

    expect(result.text).toContain("No available teams");
  });
});

describe("runAIChat — owner-only admin actions", () => {
  it("executes a Coins grant when isOwner is true", async () => {
    parseAIReply.mockReturnValue(baseParsed({
      ownerAdminRequest: { action: "grant", email: "buyer@example.com", amount: 10 },
    }));
    ownerGrantTxByEmail.mockResolvedValue({ ok: true, message: "Granted 10 Coins" });

    const result = await runAIChat({ surface: "whatsapp", message: "add 10 tx to buyer@example.com", isOwner: true });

    expect(ownerGrantTxByEmail).toHaveBeenCalledWith("buyer@example.com", 10, expect.any(String));
    expect(result.text).toContain("Granted 10 Coins");
  });

  it("never executes an admin action when isOwner is false", async () => {
    parseAIReply.mockReturnValue(baseParsed({
      ownerAdminRequest: { action: "grant", email: "buyer@example.com", amount: 999999 },
    }));

    const result = await runAIChat({ surface: "whatsapp", message: "add 999999 tx", isOwner: false });

    expect(ownerGrantTxByEmail).not.toHaveBeenCalled();
    expect(result.text).toBe("Here's a normal reply.");
  });

  it("lists flags for the 'flags' action", async () => {
    getDisabledServices.mockResolvedValue(["panels"]);
    getDisabledPaymentMethods.mockResolvedValue([]);
    parseAIReply.mockReturnValue(baseParsed({ ownerAdminRequest: { action: "flags" } }));

    const result = await runAIChat({ surface: "whatsapp", message: "flags", isOwner: true });

    expect(result.text).toContain("panels: DISABLED");
  });

  it("disables a valid service key", async () => {
    getDisabledServices.mockResolvedValue([]);
    parseAIReply.mockReturnValue(baseParsed({ ownerAdminRequest: { action: "disable", key: "boost" } }));

    const result = await runAIChat({ surface: "whatsapp", message: "disable boost", isOwner: true });

    expect(setDisabledServices).toHaveBeenCalledWith(["boost"]);
    expect(result.text).toContain("boost is now DISABLED");
  });

  it("rejects an unknown service key without calling setDisabledServices", async () => {
    parseAIReply.mockReturnValue(baseParsed({ ownerAdminRequest: { action: "disable", key: "not-a-real-service" } }));

    const result = await runAIChat({ surface: "whatsapp", message: "disable nonsense", isOwner: true });

    expect(setDisabledServices).not.toHaveBeenCalled();
    expect(result.text).toContain("Usage key");
  });

  it("runs unban with a cleaned phone number", async () => {
    unbanWaContact.mockResolvedValue({ ok: true, message: "Unbanned" });
    parseAIReply.mockReturnValue(baseParsed({ ownerAdminRequest: { action: "unban", phone: "+254 711 222 333" } }));

    const result = await runAIChat({ surface: "whatsapp", message: "unban +254 711 222 333", isOwner: true });

    expect(unbanWaContact).toHaveBeenCalledWith("254711222333", null);
    expect(result.text).toBe("Unbanned");
  });

  it("returns a safe error if the admin action throws", async () => {
    ownerLookupUserByEmail.mockRejectedValue(new Error("db down"));
    parseAIReply.mockReturnValue(baseParsed({ ownerAdminRequest: { action: "lookup", email: "buyer@example.com" } }));

    const result = await runAIChat({ surface: "whatsapp", message: "lookup buyer@example.com", isOwner: true });

    expect(result.text).toContain("Action failed");
  });
});

describe("runAIChat — conversation memory", () => {
  it("appends both the user message and the assistant reply when userLabel is set", async () => {
    parseAIReply.mockReturnValue(baseParsed({ text: "Sure thing." }));

    await runAIChat({ surface: "whatsapp", message: "hello", isOwner: false, userLabel: "wa:2547xxxx" });

    expect(appendMemory).toHaveBeenCalledWith("wa:2547xxxx", "user", "hello");
    expect(appendMemory).toHaveBeenCalledWith("wa:2547xxxx", "assistant", "Sure thing.");
  });

  it("does not append memory when userLabel is absent", async () => {
    parseAIReply.mockReturnValue(baseParsed());

    await runAIChat({ surface: "whatsapp", message: "hello", isOwner: false });

    expect(appendMemory).not.toHaveBeenCalled();
  });
});
