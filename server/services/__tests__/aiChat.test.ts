import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

const askAI = vi.fn();
const parseAIReply = vi.fn();

vi.mock("../../lib/ai.js", () => ({
  askAI: (...args: unknown[]) =>
    askAI(...args),

  parseAIReply: (...args: unknown[]) =>
    parseAIReply(...args),
}));

const buildPromptContext = vi.fn();

vi.mock("../../lib/promptContext.js", () => ({
  buildPromptContext: (
    ...args: unknown[]
  ) => buildPromptContext(...args),
}));

const appendMemory = vi.fn();
const formatMemoryForPrompt = vi.fn();

vi.mock("../../lib/aiMemory.js", () => ({
  appendMemory: (
    ...args: unknown[]
  ) => appendMemory(...args),

  formatMemoryForPrompt: (
    ...args: unknown[]
  ) => formatMemoryForPrompt(...args),
}));

vi.mock("../../prompts/whatsappPrompt.js", () => ({
  buildWhatsAppPrompt: vi.fn(
    () => "whatsapp-system-prompt",
  ),
}));

vi.mock("../../prompts/sitePrompt.js", () => ({
  buildSitePrompt: vi.fn(
    () => "site-system-prompt",
  ),
}));

const notifyOwnerRoutine = vi.fn(
  () => Promise.resolve(),
);

vi.mock("../notify.js", () => ({
  notifyOwnerRoutine: (
    ...args: unknown[]
  ) => notifyOwnerRoutine(...args),
}));

const ownerLookupUserByEmail = vi.fn();
const ownerPlatformStats = vi.fn();

vi.mock("../bot/ownerOps.js", () => ({
  ownerLookupUserByEmail: (
    ...args: unknown[]
  ) => ownerLookupUserByEmail(...args),

  ownerPlatformStats: (
    ...args: unknown[]
  ) => ownerPlatformStats(...args),
}));

const deployBotForAdmin = vi.fn();

vi.mock("../ownerDeploy.js", () => ({
  deployBotForAdmin: (
    ...args: unknown[]
  ) => deployBotForAdmin(...args),
}));

const getDisabledServices = vi.fn();
const getDisabledPaymentMethods = vi.fn();
const setDisabledServices = vi.fn();
const setDisabledPaymentMethods = vi.fn();

vi.mock("../../lib/featureFlags.js", () => ({
  getDisabledServices: (
    ...args: unknown[]
  ) => getDisabledServices(...args),

  getDisabledPaymentMethods: (
    ...args: unknown[]
  ) => getDisabledPaymentMethods(...args),

  setDisabledServices: (
    ...args: unknown[]
  ) => setDisabledServices(...args),

  setDisabledPaymentMethods: (
    ...args: unknown[]
  ) => setDisabledPaymentMethods(...args),
}));

const unbanWaContact = vi.fn();

vi.mock("../waSecurity.js", () => ({
  unbanWaContact: (
    ...args: unknown[]
  ) => unbanWaContact(...args),
}));

vi.mock("../whatsappOwner.js", () => ({
  getActiveWaSock: vi.fn(
    () => null,
  ),
}));

import {
  runAIChat,
} from "../aiChat.js";

function baseParsed(
  overrides: Record<string, unknown> = {},
) {
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

  buildPromptContext.mockResolvedValue({
    isOwner: false,
    disabledServices: [],
    disabledPaymentMethods: [],
    pricing: {},
  });

  askAI.mockResolvedValue(
    "raw ai response",
  );

  getDisabledServices.mockResolvedValue(
    [],
  );

  getDisabledPaymentMethods.mockResolvedValue(
    [],
  );

  formatMemoryForPrompt.mockReturnValue(
    "",
  );

  notifyOwnerRoutine.mockResolvedValue(
    undefined,
  );

  ownerLookupUserByEmail.mockResolvedValue(
    {
      ok: true,
      email: "user@example.com",
      username: "testuser",
      bots: 0,
      panels: 0,
    },
  );

  ownerPlatformStats.mockResolvedValue(
    {
      ok: true,
      users: 1,
      activeBots: 0,
      totalBots: 0,
      panels: 0,
      mode: "Free",
    },
  );

  setDisabledServices.mockResolvedValue(
    undefined,
  );

  setDisabledPaymentMethods.mockResolvedValue(
    undefined,
  );

  unbanWaContact.mockResolvedValue(
    {
      ok: true,
      message: "Unbanned",
    },
  );
});

describe(
  "runAIChat — plain replies",
  () => {
    it(
      "returns the parsed text untouched when there are no markers",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed(),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message: "hi",
            isOwner: false,
          });

        expect(result.text).toBe(
          "Here's a normal reply.",
        );

        expect(
          result.requestLiveAgent,
        ).toBe(false);

        expect(
          result.deployRequest,
        ).toBeNull();
      },
    );

    it(
      "truncates the outgoing prompt input to 2000 chars",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed(),
        );

        const longMessage =
          "a".repeat(3000);

        await runAIChat({
          surface: "whatsapp",
          message: longMessage,
          isOwner: false,
        });

        expect(
          askAI.mock.calls[0][0].length,
        ).toBeLessThanOrEqual(2000);
      },
    );
  },
);

describe(
  "runAIChat — live agent handoff",
  () => {
    it(
      "notifies the owner on the site surface",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            requestLiveAgent: true,
            text: "Connecting you now.",
          }),
        );

        await runAIChat({
          surface: "site",
          message:
            "let me talk to a human",
          isOwner: false,
          userLabel: "site:abc",
        });

        expect(
          notifyOwnerRoutine,
        ).toHaveBeenCalledWith(
          expect.stringContaining(
            "Live agent requested",
          ),
        );
      },
    );

    it(
      "does not notify the owner for WhatsApp handoff",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            requestLiveAgent: true,
          }),
        );

        await runAIChat({
          surface: "whatsapp",
          message:
            "talk to the owner",
          isOwner: false,
        });

        expect(
          notifyOwnerRoutine,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  "runAIChat — owner-only deploy",
  () => {
    const deployMarker = {
      appName: "myapp",
      sessionVar: "abc123",
      device: "android" as const,
      isTrial: false,
      months: 1,
    };

    it(
      "executes deployment for the owner",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            deployRequest:
              deployMarker,
            text: "On it.",
          }),
        );

        deployBotForAdmin.mockResolvedValue(
          {
            ok: true,
            message:
              "Deployed myapp",
          },
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "deploy myapp",
            isOwner: true,
            userLabel: "wa:owner",
          });

        expect(
          deployBotForAdmin,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            appName: "myapp",
            sessionVar: "abc123",
          }),
        );

        expect(
          result.text,
        ).toContain(
          "Deployed myapp",
        );
      },
    );

    it(
      "does not deploy for non-owner users",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            deployRequest:
              deployMarker,
          }),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "deploy myapp",
            isOwner: false,
          });

        expect(
          deployBotForAdmin,
        ).not.toHaveBeenCalled();

        expect(
          result.text,
        ).toBe(
          "Here's a normal reply.",
        );
      },
    );

    it(
      "handles unexpected deployment errors safely",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            deployRequest:
              deployMarker,
          }),
        );

        deployBotForAdmin.mockRejectedValue(
          new Error("Heroku down"),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "deploy myapp",
            isOwner: true,
          });

        expect(
          result.text,
        ).toMatch(
          /Deploy failed unexpectedly/i,
        );
      },
    );

    it(
      "returns the provider error when deployment fails cleanly",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            deployRequest:
              deployMarker,
          }),
        );

        deployBotForAdmin.mockResolvedValue(
          {
            ok: false,
            error:
              "No available teams",
          },
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "deploy myapp",
            isOwner: true,
          });

        expect(
          result.text,
        ).toContain(
          "No available teams",
        );
      },
    );
  },
);

describe(
  "runAIChat — owner admin actions",
  () => {
    it(
      "executes a user lookup for the owner",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "lookup",
              email:
                "user@example.com",
            },
          }),
        );

        ownerLookupUserByEmail.mockResolvedValue(
          {
            ok: true,
            email:
              "user@example.com",
            username:
              "testuser",
            bots: 2,
            panels: 1,
          },
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "lookup user@example.com",
            isOwner: true,
          });

        expect(
          ownerLookupUserByEmail,
        ).toHaveBeenCalledWith(
          "user@example.com",
        );

        expect(
          result.text,
        ).toContain(
          "user@example.com",
        );
      },
    );

    it(
      "executes platform stats for the owner",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "stats",
            },
          }),
        );

        ownerPlatformStats.mockResolvedValue(
          {
            ok: true,
            users: 10,
            activeBots: 4,
            totalBots: 8,
            panels: 3,
            mode: "Free",
          },
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "show platform stats",
            isOwner: true,
          });

        expect(
          ownerPlatformStats,
        ).toHaveBeenCalled();

        expect(
          result.text,
        ).toContain("Free");
      },
    );

    it(
      "does not execute owner actions for normal users",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "stats",
            },
          }),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "show stats",
            isOwner: false,
          });

        expect(
          ownerPlatformStats,
        ).not.toHaveBeenCalled();

        expect(
          ownerLookupUserByEmail,
        ).not.toHaveBeenCalled();

        expect(
          result.text,
        ).toBe(
          "Here's a normal reply.",
        );
      },
    );

    it(
      "lists service flags",
      async () => {
        getDisabledServices.mockResolvedValue(
          ["panels"],
        );

        getDisabledPaymentMethods.mockResolvedValue(
          [],
        );

        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "flags",
            },
          }),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message: "flags",
            isOwner: true,
          });

        expect(
          result.text,
        ).toContain(
          "panels: DISABLED",
        );
      },
    );

    it(
      "disables a valid service",
      async () => {
        getDisabledServices.mockResolvedValue(
          [],
        );

        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "disable",
              key: "boost",
            },
          }),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "disable boost",
            isOwner: true,
          });

        expect(
          setDisabledServices,
        ).toHaveBeenCalledWith([
          "boost",
        ]);

        expect(
          result.text,
        ).toContain(
          "boost is now DISABLED",
        );
      },
    );

    it(
      "rejects an unknown service key",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "disable",
              key:
                "not-a-real-service",
            },
          }),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "disable nonsense",
            isOwner: true,
          });

        expect(
          setDisabledServices,
        ).not.toHaveBeenCalled();

        expect(
          result.text,
        ).toContain(
          "Usage key",
        );
      },
    );

    it(
      "unbans a WhatsApp contact",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "unban",
              phone:
                "+254 711 222 333",
            },
          }),
        );

        unbanWaContact.mockResolvedValue(
          {
            ok: true,
            message: "Unbanned",
          },
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "unban +254 711 222 333",
            isOwner: true,
          });

        expect(
          unbanWaContact,
        ).toHaveBeenCalledWith(
          "254711222333",
          null,
        );

        expect(
          result.text,
        ).toContain(
          "Unbanned",
        );
      },
    );

    it(
      "handles admin action failures safely",
      async () => {
        ownerLookupUserByEmail.mockRejectedValue(
          new Error("db down"),
        );

        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "lookup",
              email:
                "user@example.com",
            },
          }),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "lookup user@example.com",
            isOwner: true,
          });

        expect(
          result.text,
        ).toContain(
          "Action failed",
        );
      },
    );

    it(
      "does not perform financial operations in free mode",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest: {
              action: "grant",
              email:
                "user@example.com",
              amount: 100,
            },
          }),
        );

        const result =
          await runAIChat({
            surface: "whatsapp",
            message:
              "grant 100 Coins",
            isOwner: true,
          });

        expect(
          result.text,
        ).toMatch(
          /free mode|no longer available|disabled/i,
        );
      },
    );
  },
);

describe(
  "runAIChat — conversation memory",
  () => {
    it(
      "stores both the user message and assistant reply",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            text: "Sure thing.",
          }),
        );

        await runAIChat({
          surface: "whatsapp",
          message: "hello",
          isOwner: false,
          userLabel:
            "wa:2547xxxx",
        });

        expect(
          appendMemory,
        ).toHaveBeenCalledWith(
          "wa:2547xxxx",
          "user",
          "hello",
        );

        expect(
          appendMemory,
        ).toHaveBeenCalledWith(
          "wa:2547xxxx",
          "assistant",
          "Sure thing.",
        );
      },
    );

    it(
      "does not store memory without a user label",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed(),
        );

        await runAIChat({
          surface: "whatsapp",
          message: "hello",
          isOwner: false,
        });

        expect(
          appendMemory,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
