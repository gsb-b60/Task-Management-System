import { describe, expect, it } from "vitest";
import { resolveCookieSecure } from "../../src/config/env.js";

describe("resolveCookieSecure", () => {
  it("defaults to Secure in production (phase 13 keeps https-only)", () => {
    expect(resolveCookieSecure(undefined, "production")).toBe(true);
  });

  it("defaults to plain-http outside production", () => {
    expect(resolveCookieSecure(undefined, "development")).toBe(false);
    expect(resolveCookieSecure(undefined, "test")).toBe(false);
  });

  it("honours an explicit override regardless of NODE_ENV", () => {
    expect(resolveCookieSecure("true", "development")).toBe(true);
    expect(resolveCookieSecure("false", "production")).toBe(false);
  });
});
