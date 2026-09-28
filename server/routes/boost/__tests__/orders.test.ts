import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

import express from "express";
import request from "supertest";

const mockUserId =
  "507f1f77bcf86cd799439011";

const authState = {
  viaApiKey: false,
};

vi.mock(
  "../../../middleware/sessionOrApiKey.js",
  () => ({
    sessionOrApiKeyGuard: (
      req: any,
      _res: any,
      next: any,
    ) => {
      req.user = {
        _id: mockUserId,
      };

      req.viaApiKey =
        authState.viaApiKey;

      next();
    },
  }),
);

vi.mock(
  "../../../middleware/banCheck.js",
  () => ({
    banCheck: (
      _req: any,
      _res: any,
      next: any,
    ) => next(),
  }),
);

vi.mock(
  "../../../middleware/rateLimit.js",
  () => ({
    paymentRateLimit: (
      _req: any,
      _res: any,
      next: any,
    ) => next(),
  }),
);

const UserFindById =
  vi.fn();

const BoostOrderCreate =
  vi.fn();

const BoostOrderFind =
  vi.fn();

const BoostOrderCountDocuments =
  vi.fn();

vi.mock(
  "../../../models/User.js",
  () => ({
    User: {
      findById: (
        ...args: unknown[]
      ) =>
        UserFindById(...args),
    },
  }),
);

vi.mock(
  "../../../models/BoostOrder.js",
  () => ({
    BoostOrder: {
      create: (
        ...args: unknown[]
      ) =>
        BoostOrderCreate(
          ...args,
        ),

      findOne: vi.fn(),

      find: (
        ...args: unknown[]
      ) =>
        BoostOrderFind(...args),

      countDocuments: (
        ...args: unknown[]
      ) =>
        BoostOrderCountDocuments(
          ...args,
        ),
    },
  }),
);

const TransactionCreate =
  vi.fn();

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

const createNotification =
  vi.fn(
    () => Promise.resolve(),
  );

const notifyOwner =
  vi.fn(
    () => Promise.resolve(),
  );

vi.mock(
  "../../../services/notifications.js",
  () => ({
    createNotification: (
      ...args: unknown[]
    ) =>
      createNotification(
        ...args,
      ),
  }),
);

vi.mock(
  "../../../services/notify.js",
  () => ({
    notifyOwner: (
      ...args: unknown[]
    ) =>
      notifyOwner(...args),
  }),
);

const placeProviderOrder =
  vi.fn();

const getProviderOrderStatus =
  vi.fn();

vi.mock(
  "../../../services/boostProvider.js",
  () => ({
    placeProviderOrder: (
      ...args: unknown[]
    ) =>
      placeProviderOrder(
        ...args,
      ),

    getProviderOrderStatus: (
      ...args: unknown[]
    ) =>
      getProviderOrderStatus(
        ...args,
      ),
  }),
);

const getCachedServiceById =
  vi.fn();

vi.mock(
  "../../../services/boostCatalogSync.js",
  () => ({
    getCachedServiceById: (
      ...args: unknown[]
    ) =>
      getCachedServiceById(
        ...args,
      ),
  }),
);

vi.mock(
  "../../../utils/boostStatus.js",
  () => ({
    normalizeBoostStatus:
      vi.fn(
        (
          status: string,
        ) => status,
      ),

    countsAsCompleted:
      vi.fn(
        () => false,
      ),
  }),
);

import ordersRouter from "../orders.js";

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
    "/api/boost",
    ordersRouter,
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
     * The field can still exist in the database,
     * but boost orders must never modify it.
     */
    txCoins: 0,

    email:
      "user@example.com",

    username:
      "testuser",

    save: vi.fn(
      () =>
        Promise.resolve(),
    ),

    ...overrides,
  };
}

function fakeService(
  overrides: Record<
    string,
    unknown
  > = {},
) {
  return {
    providerId: 555,

    provider: "prov1",

    name:
      "Instagram Followers",

    category:
      "instagram",

    baseKesPer1000:
      1000,

    min: 10,

    max: 10000,

    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  authState.viaApiKey =
    false;

  UserFindById.mockResolvedValue(
    fakeUser(),
  );

  getCachedServiceById.mockResolvedValue(
    fakeService(),
  );

  placeProviderOrder.mockResolvedValue(
    {
      order_id: "provider-order-1",
      status: "processing",
    },
  );

  BoostOrderCreate.mockImplementation(
    async (
      document: Record<
        string,
        unknown
      >,
    ) => ({
      _id: "boost-order-1",

      ...document,

      save: vi.fn(
        () =>
          Promise.resolve(),
      ),
    }),
  );

  TransactionCreate.mockResolvedValue(
    undefined,
  );

  createNotification.mockResolvedValue(
    undefined,
  );

  notifyOwner.mockResolvedValue(
    undefined,
  );

  BoostOrderCountDocuments.mockReturnValue(
    {
      maxTimeMS: vi.fn(
        () =>
          Promise.resolve(0),
      ),
    },
  );
});

describe(
  "POST /api/boost/order",
  () => {
    it(
      "creates a free boost order without requiring Coins",
      async () => {
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
              "/api/boost/order",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(200);

        expect(
          res.body.ok,
        ).toBe(true);

        expect(
          res.body.order,
        ).toMatchObject({
          id:
            "boost-order-1",
          status:
            "processing",
          costTx: 0,
          costKes: 0,
          requiredTx: 0,
          balanceLeft: 0,
        });

        expect(
          BoostOrderCreate,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              mockUserId,

            serviceName:
              "Instagram Followers",

            quantity: 100,

            costTx: 0,

            costKes: 0,

            paymentMethod:
              "free",

            status:
              "pending",
          }),
        );

        expect(
          placeProviderOrder,
        ).toHaveBeenCalledWith({
          service_id: 555,
          provider:
            "prov1",
          link:
            "https://instagram.com/example",
          quantity: 100,
        });

        expect(
          user.txCoins,
        ).toBe(0);

        expect(
          TransactionCreate,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              mockUserId,
            type:
              "boost",
            txAmount:
              0,
            ksAmount:
              0,
            status:
              "success",
          }),
        );
      },
    );

    it(
      "does not reject an order because the user has zero Coins",
      async () => {
        UserFindById.mockResolvedValue(
          fakeUser({
            txCoins: 0,
          }),
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(200);

        expect(
          res.body.order.costTx,
        ).toBe(0);

        expect(
          res.body.order.requiredTx,
        ).toBe(0);

        expect(
          placeProviderOrder,
        ).toHaveBeenCalled();
      },
    );

    it(
      "returns 404 when the boost service does not exist",
      async () => {
        getCachedServiceById.mockResolvedValue(
          null,
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order",
            )
            .send({
              serviceId: 999,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(404);

        expect(
          res.body.error,
        ).toMatch(
          /service not found/i,
        );

        expect(
          BoostOrderCreate,
        ).not.toHaveBeenCalled();

        expect(
          placeProviderOrder,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects a quantity below the service minimum",
      async () => {
        getCachedServiceById.mockResolvedValue(
          fakeService({
            min: 100,
            max: 500,
          }),
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 50,
            });

        expect(
          res.status,
        ).toBe(400);

        expect(
          res.body.error,
        ).toMatch(
          /between 100 and 500/i,
        );

        expect(
          BoostOrderCreate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects a quantity above the service maximum",
      async () => {
        getCachedServiceById.mockResolvedValue(
          fakeService({
            min: 100,
            max: 500,
          }),
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 501,
            });

        expect(
          res.status,
        ).toBe(400);

        expect(
          res.body.error,
        ).toMatch(
          /between 100 and 500/i,
        );

        expect(
          BoostOrderCreate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "does not create a payment or Coin debit",
      async () => {
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
              "/api/boost/order",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(200);

        expect(
          user.txCoins,
        ).toBe(0);

        const createArgs =
          BoostOrderCreate.mock
            .calls[0]?.[0];

        expect(
          createArgs,
        ).toEqual(
          expect.objectContaining({
            costTx: 0,
            costKes: 0,
            paymentMethod:
              "free",
          }),
        );

        expect(
          TransactionCreate,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            txAmount: 0,
            ksAmount: 0,
          }),
        );
      },
    );

    it(
      "returns 502 when the provider rejects a free order",
      async () => {
        const user =
          fakeUser({
            txCoins: 0,
          });

        UserFindById.mockResolvedValue(
          user,
        );

        placeProviderOrder.mockRejectedValue(
          new Error(
            "provider offline",
          ),
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(502);

        expect(
          res.body.error,
        ).toMatch(
          /provider offline/i,
        );

        expect(
          user.txCoins,
        ).toBe(0);

        /*
         * A provider failure is not a payment failure:
         * there is nothing to refund because the order
         * was free.
         */
        expect(
          TransactionCreate,
        ).not.toHaveBeenCalled();

        expect(
          createNotification,
        ).toHaveBeenCalled();
      },
    );

    it(
      "allows an API-key request without Coins",
      async () => {
        authState.viaApiKey =
          true;

        UserFindById.mockResolvedValue(
          fakeUser({
            txCoins: 0,
          }),
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(200);

        expect(
          res.body.order.costTx,
        ).toBe(0);

        expect(
          res.body.order.requiredTx,
        ).toBe(0);
      },
    );
  },
);

describe(
  "POST /api/boost/order/prepare",
  () => {
    it(
      "creates the order directly instead of starting a payment",
      async () => {
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
              "/api/boost/order/prepare",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(200);

        expect(
          res.body.ok,
        ).toBe(true);

        expect(
          res.body.paymentRequired,
        ).toBe(false);

        expect(
          res.body.free,
        ).toBe(true);

        expect(
          res.body.costTx,
        ).toBe(0);

        expect(
          res.body.costKes,
        ).toBe(0);

        expect(
          BoostOrderCreate,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            costTx: 0,
            costKes: 0,
            paymentMethod:
              "free",
          }),
        );

        expect(
          placeProviderOrder,
        ).toHaveBeenCalled();

        expect(
          user.txCoins,
        ).toBe(0);
      },
    );

    it(
      "returns 404 for an unknown service",
      async () => {
        getCachedServiceById.mockResolvedValue(
          null,
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order/prepare",
            )
            .send({
              serviceId: 999,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(404);

        expect(
          BoostOrderCreate,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "returns 502 when the provider rejects preparation",
      async () => {
        placeProviderOrder.mockRejectedValue(
          new Error(
            "provider unavailable",
          ),
        );

        const res =
          await request(
            buildApp(),
          )
            .post(
              "/api/boost/order/prepare",
            )
            .send({
              serviceId: 1,
              link:
                "https://instagram.com/example",
              quantity: 100,
            });

        expect(
          res.status,
        ).toBe(502);

        expect(
          res.body.error,
        ).toMatch(
          /provider unavailable/i,
        );

        expect(
          TransactionCreate,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  "GET /api/boost/orders",
  () => {
    it(
      "returns the user's orders",
      async () => {
        const orders =
          [
            {
              _id:
                "order-1",
              userId:
                mockUserId,
              serviceName:
                "Instagram Followers",
              quantity:
                100,
              costTx:
                0,
              costKes:
                0,
              paymentMethod:
                "free",
              status:
                "completed",
            },
          ];

        BoostOrderFind.mockReturnValue(
          {
            sort: vi
              .fn()
              .mockReturnValue({
                limit: vi
                  .fn()
                  .mockReturnValue({
                    lean: vi
                      .fn()
                      .mockResolvedValue(
                        orders,
                      ),
                  }),
              }),
          },
        );

        const res =
          await request(
            buildApp(),
          ).get(
            "/api/boost/orders",
          );

        expect(
          res.status,
        ).toBe(200);

        expect(
          res.body.orders,
        ).toEqual(
          orders,
        );

        expect(
          res.body.stats,
        ).toBeDefined();
      },
    );
  },
);
