import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";
import express from "express";
import request from "supertest";
import type {
  Request,
  Response,
  NextFunction,
} from "express";
const mockUserId =
  "507f1f77bcf86cd799439011";
vi.mock(
  "../../../middleware/auth.js",
  () => ({
    authGuard: (
      req: Request,
      _res: Response,
      next: NextFunction,
    ) => {
      (req as any).user = {
        _id: mockUserId,
      };
      next();
    },
  }),
);
vi.mock(
  "../../../middleware/banCheck.js",
  () => ({
    banCheck: (
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => next(),
  }),
);
const BotFind = vi.fn();
const BotFindOne = vi.fn();
const BotCreate = vi.fn();
const BotDeleteOne = vi.fn();
const BotFindByIdAndUpdate =
  vi.fn();
const UserFindById = vi.fn();
const UserUpdateOne = vi.fn();
const TeamFind = vi.fn();
const TransactionCreate =
  vi.fn();
vi.mock(
  "../../../models/Bot.js",
  () => ({
    Bot: {
      find: (
        ...args: unknown[]
      ) => BotFind(...args),
      findOne: (
        ...args: unknown[]
      ) => BotFindOne(...args),
      create: (
        ...args: unknown[]
      ) => BotCreate(...args),
      deleteOne: (
        ...args: unknown[]
      ) => BotDeleteOne(...args),
      findByIdAndUpdate: (
        ...args: unknown[]
      ) =>
        BotFindByIdAndUpdate(
          ...args,
        ),
    },
  }),
);
vi.mock(
  "../../../models/User.js",
  () => ({
    User: {
      findById: (
        ...args: unknown[]
      ) =>
        UserFindById(...args),
      updateOne: (
        ...args: unknown[]
      ) =>
        UserUpdateOne(
          ...args,
        ),
    },
  }),
);
vi.mock(
  "../../../models/Team.js",
  () => ({
    Team: {
      find: (
        ...args: unknown[]
      ) => TeamFind(...args),
    },
  }),
);
vi.mock(
  "../../../models/Transaction.js",
  () => ({
    Transaction: {
      create: (
        ...args: unknown[]
      ) =>
        TransactionCreate(
          ...args,
        ),
    },
  }),
);
vi.mock(
  "../../../models/BlockedTrial.js",
  () => ({
    BlockedTrial: {
      deleteOne: vi.fn(),
    },
  }),
);
vi.mock(
  "../../../models/BotTemplate.js",
  () => ({
    BotTemplate: {
      findById: vi.fn(),
    },
  }),
);
const deployBotApp = vi.fn();
const findBestTeam = vi.fn();
const setConfigVar = vi.fn();
const appExists = vi.fn();
vi.mock(
  "../../../services/heroku.js",
  () => ({
    deployBotApp: (
      ...args: unknown[]
    ) =>
      deployBotApp(...args),
    deleteApp: vi.fn(),
    findBestTeam: (
      ...args: unknown[]
    ) =>
      findBestTeam(...args),
    setConfigVar: (
      ...args: unknown[]
    ) =>
      setConfigVar(...args),
    getSetupStatus: vi.fn(),
    appExists: (
      ...args: unknown[]
    ) =>
      appExists(...args),
  }),
);
vi.mock(
  "../../../services/notify.js",
  () => ({
    notifyOwner: vi.fn(
      () =>
        Promise.resolve(),
    ),
  }),
);
vi.mock(
  "../../../services/notifications.js",
  () => ({
    createNotification: vi.fn(
      () =>
        Promise.resolve(),
    ),
  }),
);
vi.mock(
  "../../../services/botRefund.js",
  () => ({
    refundBotCost: vi.fn(
      () =>
        Promise.resolve(),
    ),
  }),
);
vi.mock(
  "../../../lib/featureFlags.js",
  () => ({
    isServiceDisabled: vi.fn(
      () =>
        Promise.resolve(false),
    ),
  }),
);
import deployRouter from "../deploy.js";
import {
  errorHandler,
} from "../../../lib/errors.js";
function buildApp() {
  const app =
    express();
  app.use(
    express.json(),
  );
  app.use(
    "/api/bots",
    deployRouter,
  );
  app.use(
    errorHandler,
  );
  return app;
}
function fakeUser(
  overrides: Record<
    string,
    unknown
  > = {},
) {
  return {
    _id: mockUserId,
    /*
     * Kept only as a persisted user
     * field. The free deployment route
     * must never deduct it.
     */
    txCoins: 0,
    usedFreeTrial: false,
    bots: [],
    save: vi.fn(
      () =>
        Promise.resolve(),
    ),
    ...overrides,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  TeamFind.mockResolvedValue([
    {
      name: "team-a",
      active: true,
    },
  ]);
  findBestTeam.mockResolvedValue(
    "team-a",
  );
  BotFindOne.mockResolvedValue(
    null,
  );
  BotFind.mockReturnValue({
    lean: () =>
      Promise.resolve([]),
  });
  BotDeleteOne.mockResolvedValue({
    acknowledged: true,
  });
  UserUpdateOne.mockResolvedValue({
    acknowledged: true,
  });
  BotFindByIdAndUpdate.mockResolvedValue(
    undefined,
  );
  BotCreate.mockImplementation(
    async (
      doc: Record<
        string,
        unknown
      >,
    ) => ({
      _id: "bot1",
      ...doc,
    }),
  );
  deployBotApp.mockResolvedValue({
    success: true,
    setupId: undefined,
  });
  setConfigVar.mockResolvedValue(
    undefined,
  );
  appExists.mockResolvedValue(
    true,
  );
  TransactionCreate.mockResolvedValue(
    undefined,
  );
});
describe(
  "POST /api/bots/deploy",
  () => {
    it("deploys a free trial bot", async () => {
      const user =
        fakeUser();
      UserFindById.mockResolvedValue(
        user,
      );
      const res =
        await request(
          buildApp(),
        )
          .post(
            "/api/bots/deploy",
          )
          .send({
            botName:
              "gestonhost-trial-1",
            sessionVar:
              "session-data",
            isTrial: true,
          });
      expect(res.status).toBe(
        200,
      );
      expect(
        res.body.success,
      ).toBe(true);
      expect(
        user.usedFreeTrial,
      ).toBe(true);
      expect(
        user.txCoins,
      ).toBe(0);
      expect(
        TransactionCreate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "deploy",
          txAmount: 0,
          ksAmount: 0,
          status: "success",
        }),
      );
      expect(
        deployBotApp,
      ).toHaveBeenCalled();
    });
    it("does not require Coins for a normal bot deployment", async () => {
      const user =
        fakeUser({
          txCoins: 0,
        });
      UserFindById.mockResolvedValue(
        user,
      );
      const res =
        await request(
          buildApp(),
        )
          .post(
            "/api/bots/deploy",
          )
          .send({
            botName:
              "gestonhost-free-1",
            sessionVar:
              "session-data",
            isTrial: false,
            months: 1,
          });
      expect(res.status).toBe(
        200,
      );
      expect(
        res.body.success,
      ).toBe(true);
      expect(
        user.txCoins,
      ).toBe(0);
      expect(
        TransactionCreate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "deploy",
          txAmount: 0,
          ksAmount: 0,
          status: "success",
        }),
      );
      expect(
        deployBotApp,
      ).toHaveBeenCalled();
    });
    it("rejects a phone number without a country code", async () => {
      UserFindById.mockResolvedValue(
        fakeUser(),
      );
      const res =
        await request(
          buildApp(),
        )
          .post(
            "/api/bots/deploy",
          )
          .send({
            phoneNumber:
              "0712345678",
            sessionVar:
              "session-data",
          });
      expect(res.status).toBe(
        400,
      );
      expect(
        res.body.error,
      ).toMatch(
        /country code/i,
      );
      expect(
        BotCreate,
      ).not.toHaveBeenCalled();
    });
    it("rejects a bot name already in use", async () => {
      UserFindById.mockResolvedValue(
        fakeUser(),
      );
      BotFindOne.mockResolvedValue(
        {
          _id: "existing",
          status: "running",
        },
      );
      const res =
        await request(
          buildApp(),
        )
          .post(
            "/api/bots/deploy",
          )
          .send({
            botName:
              "already-taken",
            sessionVar:
              "session-data",
            isTrial: true,
          });
      expect(res.status).toBe(
        409,
      );
      expect(
        res.body.error,
      ).toMatch(
        /already in use/i,
      );
      expect(
        BotCreate,
      ).not.toHaveBeenCalled();
    });
    it("returns 500 when no deployment team is available", async () => {
      UserFindById.mockResolvedValue(
        fakeUser(),
      );
      findBestTeam.mockResolvedValue(
        null,
      );
      const res =
        await request(
          buildApp(),
        )
          .post(
            "/api/bots/deploy",
          )
          .send({
            botName:
              "gestonhost-free-2",
            sessionVar:
              "session-data",
            isTrial: true,
          });
      expect(res.status).toBe(
        500,
      );
      expect(
        res.body.error,
      ).toMatch(
        /no available teams/i,
      );
      expect(
        deployBotApp,
      ).not.toHaveBeenCalled();
    });
    it("returns 500 when the deployment provider fails", async () => {
      const user =
        fakeUser();
      UserFindById.mockResolvedValue(
        user,
      );
      deployBotApp.mockResolvedValue(
        {
          success: false,
        },
      );
      const res =
        await request(
          buildApp(),
        )
          .post(
            "/api/bots/deploy",
          )
          .send({
            botName:
              "gestonhost-free-3",
            sessionVar:
              "session-data",
            isTrial: true,
          });
      expect(res.status).toBe(
        500,
      );
      expect(
        res.body.error,
      ).toMatch(
        /failed to deploy/i,
      );
      expect(
        BotCreate,
      ).not.toHaveBeenCalled();
      expect(
        user.txCoins,
      ).toBe(0);
    });
  },
);
