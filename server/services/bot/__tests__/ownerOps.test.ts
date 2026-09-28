import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

const UserFindOne = vi.fn();
const BotCountDocuments = vi.fn();
const PanelCountDocuments = vi.fn();
const UserCountDocuments = vi.fn();

vi.mock(
  "../../../models/User.js",
  () => ({
    User: {
      findOne: (
        ...args: unknown[]
      ) => UserFindOne(...args),

      countDocuments: (
        ...args: unknown[]
      ) =>
        UserCountDocuments(
          ...args
        ),
    },
  })
);

vi.mock(
  "../../../models/Bot.js",
  () => ({
    Bot: {
      countDocuments: (
        ...args: unknown[]
      ) =>
        BotCountDocuments(
          ...args
        ),
    },
  })
);

vi.mock(
  "../../../models/Panel.js",
  () => ({
    Panel: {
      countDocuments: (
        ...args: unknown[]
      ) =>
        PanelCountDocuments(
          ...args
        ),
    },
  })
);

import {
  isValidEmail,
  normalizeEmail,
  ownerLookupUserByEmail,
  ownerPlatformStats,
  parseOwnerAdminIntent,
  runOwnerAdminIntent,
} from "../ownerOps.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe(
  "normalizeEmail",
  () => {
    it(
      "trims and lowercases email",
      () => {
        expect(
          normalizeEmail(
            "  USER@Example.COM "
          )
        ).toBe(
          "user@example.com"
        );
      }
    );
  }
);

describe(
  "isValidEmail",
  () => {
    it(
      "accepts a normal address",
      () => {
        expect(
          isValidEmail(
            "user@example.com"
          )
        ).toBe(true);
      }
    );

    it(
      "rejects missing @ or domain",
      () => {
        expect(
          isValidEmail(
            "not-an-email"
          )
        ).toBe(false);

        expect(
          isValidEmail("user@")
        ).toBe(false);
      }
    );

    it(
      "rejects an address over 254 chars",
      () => {
        const long =
          "a".repeat(250) +
          "@x.co";

        expect(
          isValidEmail(long)
        ).toBe(false);
      }
    );
  }
);

describe(
  "ownerLookupUserByEmail",
  () => {
    it(
      "returns account details with bot and panel counts",
      async () => {
        UserFindOne.mockReturnValue(
          {
            lean: () =>
              Promise.resolve({
                email:
                  "buyer@example.com",

                username:
                  "buyer",

                isBanned:
                  false,

                isModerator:
                  true,

                createdAt:
                  new Date(
                    "2026-01-01"
                  ),

                /*
                 * Legacy database field may
                 * still exist, but it must
                 * never be exposed.
                 */
                txCoins: 42,
              }),
          }
        );

        BotCountDocuments.mockResolvedValue(
          3
        );

        PanelCountDocuments.mockResolvedValue(
          1
        );

        const result =
          await ownerLookupUserByEmail(
            "buyer@example.com"
          );

        expect(
          result.ok
        ).toBe(true);

        expect(
          result.ok &&
            result.message
        ).toMatch(
          /buyer@example\.com/
        );

        expect(
          result.ok &&
            result.message
        ).toMatch(
          /Bots: 3/
        );

        expect(
          result.ok &&
            result.message
        ).toMatch(
          /Panels: 1/
        );

        expect(
          result.ok &&
            result.message
        ).toMatch(
          /Moderator: yes/
        );

        expect(
          result.ok &&
            result.message
        ).not.toMatch(
          /Coins/
        );

        expect(
          result.ok &&
            result.message
        ).not.toMatch(
          /txCoins/
        );

        expect(
          result.ok &&
            result.message
        ).not.toMatch(
          /42/
        );
      }
    );

    it(
      "returns an error when no account matches",
      async () => {
        UserFindOne.mockReturnValue(
          {
            lean: () =>
              Promise.resolve(
                null
              ),
          }
        );

        const result =
          await ownerLookupUserByEmail(
            "nobody@example.com"
          );

        expect(
          result
        ).toEqual({
          ok: false,
          error:
            "No account found for that email.",
        });
      }
    );

    it(
      "rejects an invalid email format",
      async () => {
        const result =
          await ownerLookupUserByEmail(
            "not-an-email"
          );

        expect(
          result.ok
        ).toBe(false);

        expect(
          UserFindOne
        ).not.toHaveBeenCalled();
      }
    );
  }
);

describe(
  "ownerPlatformStats",
  () => {
    it(
      "formats platform counts and free mode",
      async () => {
        UserCountDocuments.mockResolvedValue(
          100
        );

        BotCountDocuments
          .mockResolvedValueOnce(
            40
          )
          .mockResolvedValueOnce(
            55
          );

        PanelCountDocuments.mockResolvedValue(
          12
        );

        const result =
          await ownerPlatformStats();

        expect(result).toMatch(
          /Geston Host Stats/
        );

        expect(result).toMatch(
          /Users: 100/
        );

        expect(result).toMatch(
          /Active bots: 40/
        );

        expect(result).toMatch(
          /Total bots: 55/
        );

        expect(result).toMatch(
          /Panels: 12/
        );

        expect(result).toMatch(
          /Mode: Free/
        );

        expect(result).not.toMatch(
          /Coins/
        );

        expect(result).not.toMatch(
          /Payments/
        );
      }
    );
  }
);

describe(
  "parseOwnerAdminIntent",
  () => {
    it(
      "parses stats",
      () => {
        expect(
          parseOwnerAdminIntent(
            "stats"
          )
        ).toEqual({
          action: "stats",
        });
      }
    );

    it(
      "parses user lookup",
      () => {
        expect(
          parseOwnerAdminIntent(
            "user buyer@example.com"
          )
        ).toEqual({
          action: "lookup",
          email:
            "buyer@example.com",
        });
      }
    );

    it(
      "parses natural language lookup",
      () => {
        expect(
          parseOwnerAdminIntent(
            "lookup buyer@example.com"
          )
        ).toEqual({
          action: "lookup",
          email:
            "buyer@example.com",
        });
      }
    );

    it(
      "parses find lookup",
      () => {
        expect(
          parseOwnerAdminIntent(
            "find user buyer@example.com"
          )
        ).toEqual({
          action: "lookup",
          email:
            "buyer@example.com",
        });
      }
    );

    it(
      "does not parse Coins grant commands",
      () => {
        expect(
          parseOwnerAdminIntent(
            "/addtx buyer@example.com 10"
          )
        ).toEqual({
          action: null,
        });
      }
    );

    it(
      "does not parse Coins subtract commands",
      () => {
        expect(
          parseOwnerAdminIntent(
            "remove 5 tx from buyer@example.com"
          )
        ).toEqual({
          action: null,
        });
      }
    );

    it(
      "returns null action for unrecognized text",
      () => {
        expect(
          parseOwnerAdminIntent(
            "hello there, how are you?"
          )
        ).toEqual({
          action: null,
        });
      }
    );
  }
);

describe(
  "runOwnerAdminIntent",
  () => {
    it(
      "returns null for unsupported text",
      async () => {
        const result =
          await runOwnerAdminIntent(
            "hello there",
            "test"
          );

        expect(result).toBeNull();

        expect(
          UserFindOne
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "executes lookup",
      async () => {
        UserFindOne.mockReturnValue(
          {
            lean: () =>
              Promise.resolve({
                email:
                  "buyer@example.com",
                username:
                  "buyer",
                isBanned:
                  false,
                isModerator:
                  false,
                createdAt:
                  new Date(
                    "2026-01-01"
                  ),
              }),
          }
        );

        BotCountDocuments.mockResolvedValue(
          2
        );

        PanelCountDocuments.mockResolvedValue(
          1
        );

        const result =
          await runOwnerAdminIntent(
            "lookup buyer@example.com",
            "owner"
          );

        expect(
          result?.ok
        ).toBe(true);

        expect(
          result?.ok &&
            result.message
        ).toMatch(
          /Bots: 2/
        );
      }
    );

    it(
      "executes stats",
      async () => {
        UserCountDocuments.mockResolvedValue(
          1
        );

        BotCountDocuments.mockResolvedValue(
          1
        );

        PanelCountDocuments.mockResolvedValue(
          1
        );

        const result =
          await runOwnerAdminIntent(
            "stats",
            "owner"
          );

        expect(
          result?.ok
        ).toBe(true);

        expect(
          result?.ok &&
            result.message
        ).toMatch(
          /Geston Host Stats/
        );

        expect(
          result?.ok &&
            result.message
        ).toMatch(
          /Mode: Free/
        );
      }
    );
  }
);
