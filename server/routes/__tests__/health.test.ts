import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

describe("GET /api/health", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.get("/api/health", (_req, res) => {
      res.json({ status: "ok", uptime: process.uptime() });
    });
  });

  it("returns 200 and status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("uptime");
    expect(typeof res.body.uptime).toBe("number");
  });
});
