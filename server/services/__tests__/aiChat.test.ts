import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

const askAI =
  vi.fn();

const parseAIReply =
  vi.fn();

vi.mock(
  "../../lib/ai.js",
  () => ({
    askAI: (
      ...args: unknown[]
    ) =>
      askAI(...args),

    parseAIReply: (
      ...args: unknown[]
    ) =>
      parseAIReply(...args),
  })
);

const buildPromptContext =
  vi.fn();

vi.mock(
  "../../lib/promptContext.js",
  () => ({
    buildPromptContext: (
      ...args: unknown[]
    ) =>
      buildPromptContext(
        ...args
      ),
  })
);

const appendMemory =
  vi.fn();

const formatMemoryForPrompt =
  vi.fn();

vi.mock(
  "../../lib/aiMemory.js",
  () => ({
    appendMemory: (
      ...args: unknown[]
    ) =>
      appendMemory(
        ...args
      ),

    formatMemoryForPrompt: (
      ...args: unknown[]
    ) =>
      formatMemoryForPrompt(
        ...args
      ),
  })
);

vi.mock(
  "../../prompts/whatsappPrompt.js",
  () => ({
    buildWhatsAppPrompt:
      vi.fn(
        () =>
          "whatsapp-system-prompt"
      ),
  })
);

vi.mock(
  "../../prompts/sitePrompt.js",
  () => ({
    buildSitePrompt:
      vi.fn(
        () =>
          "site-system-prompt"
      ),
  })
);

const notifyOwnerRoutine =
  vi.fn(
    () =>
      Promise.resolve()
  );

vi.mock(
  "../notify.js",
  () => ({
    notifyOwnerRoutine: (
      ...args: unknown[]
    ) =>
      notifyOwnerRoutine(
        ...args
      ),
  })
);

const ownerLookupUserByEmail =
  vi.fn();

const ownerPlatformStats =
  vi.fn();

vi.mock(
  "../bot/ownerOps.js",
  () => ({
    ownerLookupUserByEmail:
      (
        ...args: unknown[]
      ) =>
        ownerLookupUserByEmail(
          ...args
        ),

    ownerPlatformStats:
      (
        ...args: unknown[]
      ) =>
        ownerPlatformStats(
          ...args
        ),
  })
);

const deployBotForAdmin =
  vi.fn();

vi.mock(
  "../ownerDeploy.js",
  () => ({
    deployBotForAdmin:
      (
        ...args: unknown[]
      ) =>
        deployBotForAdmin(
          ...args
        ),
  })
);

const getDisabledServices =
  vi.fn();

const getDisabledPaymentMethods =
  vi.fn();

const setDisabledServices =
  vi.fn();

const setDisabledPaymentMethods =
  vi.fn();

vi.mock(
  "../../lib/featureFlags.js",
  () => ({
    getDisabledServices:
      (
        ...args: unknown[]
      ) =>
        getDisabledServices(
          ...args
        ),

    getDisabledPaymentMethods:
      (
        ...args: unknown[]
      ) =>
        getDisabledPaymentMethods(
          ...args
        ),

    setDisabledServices:
      (
        ...args: unknown[]
      ) =>
        setDisabledServices(
          ...args
        ),

    setDisabledPaymentMethods:
      (
        ...args: unknown[]
      ) =>
        setDisabledPaymentMethods(
          ...args
        ),
  })
);

const unbanWaContact =
  vi.fn();

vi.mock(
  "../waSecurity.js",
  () => ({
    unbanWaContact: (
      ...args: unknown[]
    ) =>
      unbanWaContact(
        ...args
      ),
  })
);

vi.mock(
  "../whatsappOwner.js",
  () => ({
    getActiveWaSock:
      vi.fn(
        () => null
      ),
  })
);

import {
  runAIChat,
} from "../aiChat.js";

function baseParsed(
  overrides: Record<
    string,
    unknown
  > = {}
) {
  return {
    text:
      "Here's a normal reply.",

    requestLiveAgent:
      false,

    deployRequest:
      null,

    ownerAdminRequest:
      null,

    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  buildPromptContext.mockResolvedValue(
    {
      isOwner: false,
      disabledServices: [],
      disabledPaymentMethods: [],
      pricing: {},
    }
  );

  askAI.mockResolvedValue(
    "raw ai response"
  );

  formatMemoryForPrompt.mockReturnValue(
    ""
  );

  notifyOwnerRoutine.mockResolvedValue(
    undefined
  );

  ownerLookupUserByEmail.mockResolvedValue(
    {
      ok: true,
      message:
        "User user@example.com\n" +
        "Username: testuser\n" +
        "Bots: 0 · Panels: 0\n" +
        "Banned: no · Moderator: no\n" +
        "Joined: —",
    }
  );

  ownerPlatformStats.mockResolvedValue(
    "Geston Host Stats\n\n" +
      "Users: 1\n" +
      "Active bots: 0\n" +
      "Total bots: 0\n" +
      "Panels: 0\n" +
      "Mode: Free"
  );

  setDisabledServices.mockResolvedValue(
    undefined
  );

  setDisabledPaymentMethods.mockResolvedValue(
    undefined
  );

  unbanWaContact.mockResolvedValue(
    {
      ok: true,
      message: "Unbanned",
    }
  );
});

describe(
  "runAIChat — plain replies",
  () => {
    it(
      "returns parsed text",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed()
        );

        const result =
          await runAIChat({
            surface:
              "whatsapp",
            message: "hi",
            isOwner: false,
          });

        expect(
          result.text
        ).toBe(
          "Here's a normal reply."
        );

        expect(
          result.requestLiveAgent
        ).toBe(false);

        expect(
          result.deployRequest
        ).toBeNull();
      }
    );

    it(
      "limits the prompt input to 2000 characters",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed()
        );

        await runAIChat({
          surface:
            "whatsapp",

          message:
            "a".repeat(
              3000
            ),

          isOwner: false,
        });

        expect(
          askAI.mock.calls[0][0]
            .length
        ).toBeLessThanOrEqual(
          2000
        );
      }
    );
  }
);

describe(
  "runAIChat — owner admin actions",
  () => {
    it(
      "executes a user lookup for the owner",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest:
              {
                action:
                  "lookup",
                email:
                  "user@example.com",
              },
          })
        );

        const result =
          await runAIChat({
            surface:
              "whatsapp",

            message:
              "lookup user@example.com",

            isOwner: true,
          });

        expect(
          ownerLookupUserByEmail
        ).toHaveBeenCalledWith(
          "user@example.com"
        );

        expect(
          result.text
        ).toContain(
          "user@example.com"
        );
      }
    );

    it(
      "executes platform stats for the owner",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest:
              {
                action:
                  "stats",
              },
          })
        );

        const result =
          await runAIChat({
            surface:
              "whatsapp",

            message:
              "stats",

            isOwner: true,
          });

        expect(
          ownerPlatformStats
        ).toHaveBeenCalled();

        expect(
          result.text
        ).toContain(
          "Mode: Free"
        );
      }
    );

    it(
      "handles WhatsApp unban",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest:
              {
                action:
                  "unban",
                phone:
                  "243970000000",
              },
          })
        );

        const result =
          await runAIChat({
            surface:
              "whatsapp",

            message:
              "unban 243970000000",

            isOwner: true,
          });

        expect(
          unbanWaContact
        ).toHaveBeenCalled();

        expect(
          result.text
        ).toContain(
          "Unbanned"
        );
      }
    );

    it(
      "does not execute owner actions for normal users",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest:
              {
                action:
                  "stats",
              },
          })
        );

        await runAIChat({
          surface:
            "whatsapp",

          message:
            "stats",

          isOwner: false,
        });

        expect(
          ownerPlatformStats
        ).not.toHaveBeenCalled();
      }
    );
  }
);

describe(
  "runAIChat — unsupported financial actions",
  () => {
    it(
      "reports that legacy Coins operations are unavailable",
      async () => {
        parseAIReply.mockReturnValue(
          baseParsed({
            ownerAdminRequest:
              {
                action:
                  "grant",
              } as any,
          })
        );

        const result =
          await runAIChat({
            surface:
              "whatsapp",

            message:
              "grant coins",

            isOwner: true,
          });

        expect(
          result.text
        ).toContain(
          "no longer available"
        );

        expect(
          result.text
        ).toContain(
          "free mode"
        );
      }
    );
  }
);
