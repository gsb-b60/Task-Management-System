import { describe, expect, it } from "vitest";
import { app } from "./helpers.js";
import request from "supertest";

describe("Health probes", () => {
  it("GET /health is a liveness probe with no database field", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.uptimeSeconds).toEqual(expect.any(Number));
    expect(res.body.database).toBeUndefined();
  });

  it("GET /api/health reports database connectivity", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
    expect(res.body.uptimeSeconds).toEqual(expect.any(Number));
  });

  it("unknown routes fall through to the app-level 404", async () => {
    const res = await request(app).get("/api/nope");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toContain("/api/nope");
  });
});
