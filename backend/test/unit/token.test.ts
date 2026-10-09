import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_MS,
  generateSessionToken,
  hashSessionToken,
  sessionExpiry,
} from "../../src/service/token.js";

describe("session tokens (Phase 01 §4.1)", () => {
  it("generates 256 bits of base64url randomness", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).toHaveLength(43);
  });

  it("never repeats a token", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateSessionToken));
    expect(tokens.size).toBe(100);
  });

  it("hashes deterministically to a hex SHA-256 digest", () => {
    const token = generateSessionToken();
    const digest = hashSessionToken(token);

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(digest);
    expect(digest).not.toBe(token);
    expect(hashSessionToken(generateSessionToken())).not.toBe(digest);
  });

  it("session expiry is 7 days from now", () => {
    expect(SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);

    const from = new Date("2026-10-09T12:00:00.000Z");
    expect(sessionExpiry(from).getTime()).toBe(from.getTime() + SESSION_TTL_MS);

    const now = sessionExpiry().getTime();
    expect(now).toBeGreaterThan(Date.now() + SESSION_TTL_MS - 5_000);
    expect(now).toBeLessThanOrEqual(Date.now() + SESSION_TTL_MS);
  });
});
