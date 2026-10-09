import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordOrDummy } from "../../src/service/password.js";

describe("password hashing (Phase 01 §4.2)", () => {
  it("hashes with bcrypt at the configured cost", () => {
    const hash = hashPassword("Sup3rSecret!pw");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toContain("Sup3rSecret!pw");
  });

  it("verifies the correct password and rejects the wrong one", () => {
    const hash = hashPassword("Sup3rSecret!pw");
    expect(verifyPassword("Sup3rSecret!pw", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("uses a constant-time dummy comparison when there is no stored hash", () => {
    // OAuth-only accounts store passwordHash = null; the miss path still runs
    // a real bcrypt comparison so timing cannot distinguish the two.
    expect(verifyPasswordOrDummy("anything", null)).toBe(false);
    expect(verifyPasswordOrDummy("anything", undefined)).toBe(false);
    expect(verifyPasswordOrDummy("anything", "")).toBe(false);
  });

  it("verifies against a real stored hash normally", () => {
    const hash = hashPassword("Sup3rSecret!pw");
    expect(verifyPasswordOrDummy("Sup3rSecret!pw", hash)).toBe(true);
    expect(verifyPasswordOrDummy("nope", hash)).toBe(false);
  });
});
