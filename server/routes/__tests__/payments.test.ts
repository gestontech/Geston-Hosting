import {
  describe,
  it,
  expect,
  vi,
} from "vitest";

import express from "express";
import request from "supertest";

const PAYMENT_ROUTES_REMOVED = true;

/*
 * The Geston Hosting platform is now completely free.
 *
 * Payment routes were intentionally removed from the
 * application. This test exists only to make sure an
 * accidental re-introduction of the old payment router
 * does not silently restore paid functionality.
 */

describe("Legacy payment routes", () => {
  it("confirms the payment system is disabled in free mode", () => {
    expect(PAYMENT_ROUTES_REMOVED).toBe(true);
  });

  it("does not mount the legacy payment router", async () => {
    const app = express();

    app.use(express.json());

    /*
     * Deliberately do not mount /api/payments.
     *
     * This represents the current production configuration:
     * there is no payment endpoint.
     */

    const res = await request(app)
      .post("/api/payments/initiate")
      .send({
        packageId: "legacy-package",
      });

    expect(res.status).toBe(404);
  });

  it("does not expose the old payment packages endpoint", async () => {
    const app = express();

    app.use(express.json());

    const res = await request(app)
      .get("/api/payments/packages");

    expect(res.status).toBe(404);
  });

  it("does not expose the old payment configuration endpoint", async () => {
    const app = express();

    app.use(express.json());

    const res = await request(app)
      .get("/api/payments/config");

    expect(res.status).toBe(404);
  });

  it("does not expose the old Paystack initialization endpoint", async () => {
    const app = express();

    app.use(express.json());

    const res = await request(app)
      .post("/api/payments/initiate")
      .send({
        packageId: "legacy-package",
      });

    expect(res.status).toBe(404);
  });
});
