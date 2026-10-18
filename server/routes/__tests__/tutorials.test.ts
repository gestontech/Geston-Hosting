import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";

const TutorialFind = vi.fn();

vi.mock("../../models/Tutorial.js", () => ({
  Tutorial: { find: (...args: unknown[]) => TutorialFind(...args) },
}));

import tutorialsRouter from "../tutorials.js";
import { errorHandler } from "../../lib/errors.js";

function buildApp() {
  const app = express();
  app.use("/api/tutorials", tutorialsRouter);
  app.use(errorHandler);
  return app;
}

describe("GET /api/tutorials", () => {
  it("returns tutorials sorted by order", async () => {
    const lean = vi.fn().mockResolvedValue([{ title: "First" }]);
    const sort = vi.fn().mockReturnValue({ lean });
    TutorialFind.mockReturnValue({ sort });

    const res = await request(buildApp()).get("/api/tutorials");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ title: "First" }]);
    expect(sort).toHaveBeenCalledWith({ order: 1, createdAt: -1 });
  });

  it("returns a structured 500 when the database call fails", async () => {
    const lean = vi.fn().mockRejectedValue(new Error("db down"));
    const sort = vi.fn().mockReturnValue({ lean });
    TutorialFind.mockReturnValue({ sort });

    const res = await request(buildApp()).get("/api/tutorials");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Server error" });
  });
});