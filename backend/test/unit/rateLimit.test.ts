// Unit: the limiter factory builds handlers for both the default and an
// explicit window (Phase 10 coverage of the default-parameter branch).
import { describe, expect, it } from "vitest";
import { authRateLimit } from "../../src/middleware/rateLimit.js";

describe("authRateLimit factory (Phase 10 unit)", () => {
  it("builds a request handler with the default window and an explicit one", () => {
    expect(typeof authRateLimit(5)).toBe("function");
    expect(typeof authRateLimit(5, 1_000)).toBe("function");
  });
});
