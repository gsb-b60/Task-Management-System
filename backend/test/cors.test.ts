import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./helpers.js";

const ALLOWED_ORIGIN = "http://localhost:5173"; // FRONTEND_ORIGIN default in tests

describe("CORS", () => {
  it("answers a preflight with the allowed origin and credentials", async () => {
    const res = await request(app)
      .options("/api/tasks")
      .set("Origin", ALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });

  it("omits CORS headers for an origin outside the allow-list", async () => {
    const res = await request(app)
      .options("/api/tasks")
      .set("Origin", "http://evil.example")
      .set("Access-Control-Request-Method", "POST");

    // Without a matching allow-origin the browser blocks the response even if
    // the cors package still emits the credentials header.
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("adds CORS headers to actual responses for the allowed origin", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", ALLOWED_ORIGIN);

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});
