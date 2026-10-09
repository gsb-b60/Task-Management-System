import { describe, expect, it } from "vitest";
import {
  generateSessionToken,
  hashSessionToken,
  sessionExpiry,
  SESSION_TTL_MS,
} from "../../src/service/token.js";

describe("token.ts (Phase 01 unit)", () => {
  it("generates random, URL-safe tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
    // 32 bytes → base64url is 43 characters without padding.
    expect(a).toHaveLength(43);
  });

  it("stores a SHA-256 digest, never the token itself", () => {
    const token = generateSessionToken();
    const digest = hashSessionToken(token);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toBe(token);
    expect(digest).not.toContain(token);
    expect(hashSessionToken(token)).toBe(digest); // deterministic
    expect(hashSessionToken(generateSessionToken())).not.toBe(digest);
  });

  it("expires exactly seven days after issuance", () => {
    const from = new Date("2026-01-01T12:00:00.000Z");
    expect(sessionExpiry(from).getTime()).toBe(from.getTime() + SESSION_TTL_MS);
    expect(SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
