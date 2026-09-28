import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
} from "vitest";

import express from "express";
import request from "supertest";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

const mockUserId = "507f1f77bcf86cd799439011";

const mockAdminUser = {
  _id: mockUserId,
  email: "admin@example.com",
  username: "admin",
};

const mockNormalUser = {
  _id: mockUserId,
  email: "user@example.com",
  username: "user",
};

/*
 * Authentication is not the subject of these tests.
 * Always inject a deterministic authenticated user.
 */
vi.mock("../../middleware/auth.js", () => ({
  authGuard: (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    (req as any).user = {
      _id: mockUserId,
      email: "user@example.com",
    };

    next();
  },
}));

vi.mock("../../middleware/banCheck.js", () => ({
  banCheck: (
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => next(),
}));

/*
 * The router checks whether the panels service is disabled.
 *
 * IMPORTANT:
 * Never allow this test suite to call the real feature flag
 * implementation because that implementation accesses MongoDB
 * through AppSettings.
 */
vi.mock("../../lib/featureFlags.js", () => ({
  getDisabledServices: vi.fn().mockResolvedValue([]),
  getDisabledPaymentMethods: vi.fn().mockResolvedValue([]),
  isServiceDisabled: vi.fn().mockResolvedValue(false),
  isPaymentMethodDisabled: vi.fn().mockResolvedValue(false),
  setDisabledServices: vi.fn().mockResolvedValue(undefined),
  setDisabledPaymentMethods: vi.fn().mockResolvedValue(undefined),
  requirePaymentMethod: vi.fn(
    () => (
      _req: Request,
      _res: Response,
      next: NextFunction,
    ) => next(),
  ),
}));

/*
 * Defensive AppSettings mock.
 *
 * This prevents any accidental import path/cache interaction
 * from opening a real Mongoose operation during this unit test.
 */
vi.mock("../../models/AppSettings.js", () => ({
  getSetting: vi.fn().mockResolvedValue([]),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

const PanelPlanFind = vi.fn();
const PanelPlanCountDocuments = vi.fn();
const PanelPlanFindByIdAndDelete = vi.fn();
const PanelPlanCreate = vi.fn();

const PanelFind = vi.fn();
const PanelFindOne = vi.fn();
const PanelFindById = vi.fn();
const PanelFindByIdAndDelete = vi.fn();
const PanelCreate = vi.fn();

const UserFind = vi.fn();
const UserFindById = vi.fn();

const TransactionCreate = vi.fn();

const NotifyOwner = vi.fn(() => Promise.resolve());
const CreateNotification = vi.fn(() => Promise.resolve());

vi.mock("../../models/PanelPlan.js", () => ({
  PanelPlan: {
    find: (...args: unknown[]) =>
      PanelPlanFind(...args),

    findById: vi.fn(),

    countDocuments: (...args: unknown[]) =>
      PanelPlanCountDocuments(...args),

    create: (...args: unknown[]) =>
      PanelPlanCreate(...args),

    findByIdAndDelete: (...args: unknown[]) =>
      PanelPlanFindByIdAndDelete(...args),
  },
}));

vi.mock("../../models/Panel.js", () => ({
  Panel: {
    find: (...args: unknown[]) =>
      PanelFind(...args),

    findOne: (...args: unknown[]) =>
      PanelFindOne(...args),

    findById: (...args: unknown[]) =>
      PanelFindById(...args),

    findByIdAndDelete: (...args: unknown[]) =>
      PanelFindByIdAndDelete(...args),

    create: (...args: unknown[]) =>
      PanelCreate(...args),
  },
}));

vi.mock("../../models/User.js", () => ({
  User: {
    find: (...args: unknown[]) =>
      UserFind(...args),

    findById: (...args: unknown[]) =>
      UserFindById(...args),
  },
}));

vi.mock("../../models/Transaction.js", () => ({
  Transaction: {
    create: (...args: unknown[]) =>
      TransactionCreate(...args),
  },
}));

vi.mock("../../services/notify.js", () => ({
  notifyOwner: (...args: unknown[]) =>
    NotifyOwner(...args),
}));

vi.mock("../../services/notifications.js", () => ({
  createNotification: (...args: unknown[]) =>
    CreateNotification(...args),
}));

vi.mock("../../services/pterodactyl.js", () => ({
  findPanelUser: vi.fn(),
  createPanelUser: vi.fn(),
  updatePanelUserPassword: vi.fn(),
  promoteToAdmin: vi.fn(),
  getFreeAllocation: vi.fn(),
  createPanelServer: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(() => ({
      userId: mockUserId,
    })),
  },
}));

let panelsRouter:
  typeof import("../panels.js")["default"];

let errorHandler:
  typeof import("../../lib/errors.js")["errorHandler"];

beforeAll(async () => {
  vi.stubEnv(
    "ADMIN_EMAIL",
    "admin@example.com",
  );

  ({
    default: panelsRouter,
  } = await import("../panels.js"));

  ({
    errorHandler,
  } = await import(
    "../../lib/errors.js"
  ));
});

function buildApp() {
  const app = express();

  app.use(express.json());

  app.use(
    "/api/panels",
    panelsRouter,
  );

  app.use(errorHandler);

  return app;
}

beforeEach(() => {
  vi.clearAllMocks();

  /*
   * Admin authentication lookup.
   *
   * adminAuth() executes:
   *
   *   User.findById(...).lean()
   */
  UserFindById.mockReturnValue({
    lean: () =>
      Promise.resolve(mockAdminUser),
  });
});

/* -------------------------------------------------------------------------- */
/* GET /api/panels/plans                                                       */
/* -------------------------------------------------------------------------- */

describe("GET /api/panels/plans", () => {
  it("returns a structured 500 when the database call fails", async () => {
    PanelPlanFind.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.reject(
            new Error("db down"),
          ),
      }),
    });

    const res = await request(
      buildApp(),
    ).get("/api/panels/plans");

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      error: "Server error",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* GET /api/panels/my                                                          */
/* -------------------------------------------------------------------------- */

describe("GET /api/panels/my", () => {
  it("returns a structured 500 when the database call fails", async () => {
    PanelFind.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.reject(
            new Error("db down"),
          ),
      }),
    });

    const res = await request(
      buildApp(),
    ).get("/api/panels/my");

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      error: "Server error",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* DELETE /api/panels/my/:id                                                   */
/* -------------------------------------------------------------------------- */

describe("DELETE /api/panels/my/:id", () => {
  it("returns a structured 500 when the database call fails", async () => {
    PanelFindOne.mockRejectedValue(
      new Error("db down"),
    );

    const res = await request(
      buildApp(),
    ).delete(
      "/api/panels/my/507f1f77bcf86cd799439099",
    );

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      error: "Server error",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* GET /api/panels/admin/all                                                    */
/* -------------------------------------------------------------------------- */

describe("GET /api/panels/admin/all", () => {
  it("returns a structured 500 when the database call fails", async () => {
    PanelFind.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.reject(
            new Error("db down"),
          ),
      }),
    });

    const res = await request(
      buildApp(),
    )
      .get("/api/panels/admin/all")
      .set(
        "Authorization",
        "Bearer admin-token",
      );

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      error: "Server error",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* DELETE /api/panels/admin/panel/:id                                           */
/* -------------------------------------------------------------------------- */

describe("DELETE /api/panels/admin/panel/:id", () => {
  it("returns a structured 500 when the database call fails", async () => {
    PanelFindById.mockRejectedValue(
      new Error("db down"),
    );

    const res = await request(
      buildApp(),
    )
      .delete(
        "/api/panels/admin/panel/507f1f77bcf86cd799439099",
      )
      .set(
        "Authorization",
        "Bearer admin-token",
      );

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      error: "Server error",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* POST /api/panels/admin/plans                                                 */
/* -------------------------------------------------------------------------- */

describe("POST /api/panels/admin/plans", () => {
  it("returns a structured 500 when the database call fails", async () => {
    PanelPlanCountDocuments.mockRejectedValue(
      new Error("db down"),
    );

    const res = await request(
      buildApp(),
    )
      .post("/api/panels/admin/plans")
      .set(
        "Authorization",
        "Bearer admin-token",
      )
      .send({
        name: "Test Plan",
        txCost: 0,
      });

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      error: "Server error",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* DELETE /api/panels/admin/plans/:id                                           */
/* -------------------------------------------------------------------------- */

describe("DELETE /api/panels/admin/plans/:id", () => {
  it("returns a structured 500 when the database call fails", async () => {
    PanelPlanFindByIdAndDelete.mockRejectedValue(
      new Error("db down"),
    );

    const res = await request(
      buildApp(),
    )
      .delete(
        "/api/panels/admin/plans/507f1f77bcf86cd799439099",
      )
      .set(
        "Authorization",
        "Bearer admin-token",
      );

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      error: "Server error",
    });
  });
});
