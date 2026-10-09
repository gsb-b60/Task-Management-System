import { describe, expect, it } from "vitest";
import { agent, uniqueEmail } from "./helpers.js";

describe("Auth rate limiting (Phase 01 §6.3)", () => {
  it("allows 5 register attempts per key and 400s the 6th with 429", async () => {
    const email = uniqueEmail("ratelimit");
    const a = agent();

    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const res = await a
        .post("/api/auth/register")
        .send({ email, password: "Sup3rSecret!pw" });
      statuses.push(res.status);
      if (attempt === 6) {
        expect(res.status).toBe(429);
        expect(res.body.error.code).toBe("RATE_LIMITED");
      }
    }

    // Attempts 1-5 pass the limiter (1 succeeds, 2-5 hit the email conflict);
    // attempt 6 is blocked before validation or database work.
    expect(statuses.slice(0, 5)).toEqual([201, 409, 409, 409, 409]);
    expect(statuses[5]).toBe(429);
  });

  it("keys the limiter per email so another address still registers", async () => {
    const a = agent();
    const res = await a
      .post("/api/auth/register")
      .send({ email: uniqueEmail("ratelimit-other"), password: "Sup3rSecret!pw" });

    expect(res.status).toBe(201);
  });
});
