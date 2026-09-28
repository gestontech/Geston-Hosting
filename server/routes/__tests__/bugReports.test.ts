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

const mockAdminEmail =
  "admin@gestonhosting.test";

vi.mock(
  "../../middleware/auth.js",
  () => ({
    authGuard: (
      req: Request,
      _res: Response,
      next: NextFunction
    ) => {
      (req as any).user = {
        _id: mockUserId,
        email:
          (req.headers[
            "x-test-email"
          ] as string) ||
          "user@example.com",
        isModerator:
          req.headers[
            "x-test-mod"
          ] === "1",
      };

      next();
    },
  })
);

const BugReportCountDocuments =
  vi.fn();

const BugReportCreate =
  vi.fn();

const BugReportFind =
  vi.fn();

vi.mock(
  "../../models/BugReport.js",
  () => ({
    BugReport: {
      countDocuments: (
        ...args: unknown[]
      ) =>
        BugReportCountDocuments(
          ...args
        ),

      create: (
        ...args: unknown[]
      ) =>
        BugReportCreate(
          ...args
        ),

      find: (
        ...args: unknown[]
      ) =>
        BugReportFind(
          ...args
        ),
    },
  })
);

vi.mock(
  "../../services/notify.js",
  () => ({
    notifyOwner: vi.fn(
      () =>
        Promise.resolve()
    ),
  })
);

function buildApp() {
  const app =
    express();

  app.use(
    express.json()
  );

  return app;
}

let bugReportsRouter:
  typeof import(
    "../bugReports.js"
  )["default"];

beforeEach(
  async () => {
    vi.clearAllMocks();

    process.env.ADMIN_EMAIL =
      mockAdminEmail;

    BugReportCountDocuments.mockResolvedValue(
      0
    );

    BugReportCreate.mockResolvedValue(
      {
        _id: "rep1",
        status: "pending",
        title:
          "Broken deploy button",
      }
    );

    BugReportFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: () =>
            Promise.resolve([]),
        }),
      }),
    });

    const module =
      await import(
        "../bugReports.js"
      );

    bugReportsRouter =
      module.default;
  }
);

function mountedApp() {
  const app =
    buildApp();

  app.use(
    "/api/bug-reports",
    bugReportsRouter
  );

  return app;
}

describe(
  "POST /api/bug-reports",
  () => {
    it(
      "rejects invalid input",
      async () => {
        const res =
          await request(
            mountedApp()
          )
            .post(
              "/api/bug-reports"
            )
            .send({
              title: "hi",
              description:
                "too short",
            });

        expect(
          res.status
        ).toBe(400);

        expect(
          res.body.success
        ).toBe(false);

        expect(
          BugReportCreate
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "enforces max 5 reports per day",
      async () => {
        BugReportCountDocuments.mockResolvedValue(
          5
        );

        const res =
          await request(
            mountedApp()
          )
            .post(
              "/api/bug-reports"
            )
            .send({
              title:
                "Broken deploy button",

              description:
                "Clicking deploy does nothing on mobile Safari for several seconds.",
            });

        expect(
          res.status
        ).toBe(429);

        expect(
          res.body.error
        ).toMatch(
          /Max 5/i
        );

        expect(
          BugReportCreate
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "creates a pending report",
      async () => {
        const res =
          await request(
            mountedApp()
          )
            .post(
              "/api/bug-reports"
            )
            .send({
              title:
                "Broken deploy button",

              description:
                "Clicking deploy does nothing on mobile Safari for several seconds.",

              pageUrl:
                "/dashboard",
            });

        expect(
          res.status
        ).toBe(200);

        expect(
          res.body.success
        ).toBe(true);

        expect(
          res.body.data.status
        ).toBe("pending");

        expect(
          BugReportCreate
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              mockUserId,

            title:
              "Broken deploy button",

            status:
              "pending",
          })
        );
      }
    );
  }
);

describe(
  "GET /api/bug-reports/mine",
  () => {
    it(
      "returns the current user's reports",
      async () => {
        const lean =
          vi.fn().mockResolvedValue(
            [
              {
                _id: "rep1",
                title: "Bug A",
                description:
                  "details",
                status:
                  "pending",
                pageUrl: "",
                createdAt:
                  new Date(
                    "2026-01-01"
                  ),
              },
            ]
          );

        const limit =
          vi.fn().mockReturnValue({
            lean,
          });

        const sort =
          vi.fn().mockReturnValue({
            limit,
          });

        BugReportFind.mockReturnValue({
          sort,
        });

        const res =
          await request(
            mountedApp()
          )
            .get(
              "/api/bug-reports/mine"
            );

        expect(
          res.status
        ).toBe(200);

        expect(
          res.body.success
        ).toBe(true);

        expect(
          res.body.data
        ).toHaveLength(1);

        expect(
          res.body.data[0].title
        ).toBe("Bug A");
      }
    );
  }
);

describe(
  "GET /api/bug-reports/admin/all",
  () => {
    it(
      "forbids non-admin non-moderator",
      async () => {
        const res =
          await request(
            mountedApp()
          )
            .get(
              "/api/bug-reports/admin/all"
            );

        expect(
          res.status
        ).toBe(403);
      }
    );

    it(
      "allows admin email",
      async () => {
        const res =
          await request(
            mountedApp()
          )
            .get(
              "/api/bug-reports/admin/all"
            )
            .set(
              "x-test-email",
              mockAdminEmail
            );

        expect(
          res.status
        ).toBe(200);

        expect(
          res.body.success
        ).toBe(true);
      }
    );
  }
);

describe(
  "Legacy bug-report reward endpoint",
  () => {
    it(
      "is no longer available in free mode",
      async () => {
        const res =
          await request(
            mountedApp()
          )
            .post(
              "/api/bug-reports/admin/rep1/reward"
            )
            .send({
              rewardTx: 5,
            });

        expect(
          res.status
        ).toBe(404);
      }
    );

    it(
      "does not expose a Coins reward operation to admins",
      async () => {
        const res =
          await request(
            mountedApp()
          )
            .post(
              "/api/bug-reports/admin/rep1/reward"
            )
            .set(
              "x-test-email",
              mockAdminEmail
            )
            .send({
              rewardTx: 10,
            });

        expect(
          res.status
        ).toBe(404);
      }
    );
  }
);
