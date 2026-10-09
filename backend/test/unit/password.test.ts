import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordOrDummy } from "../../src/service/password.js";

describe("password.ts (Phase 01 unit)", () => {
  it("hashes to a bcrypt digest that does not contain the plaintext", () => {
    const hash = hashPassword("Sup3rSecret!pw");
    expect(hash).toMatch(/^\$2b\$12\$/);
    expect(hash).not.toContain("Sup3rSecret!pw");
  });

  it("verifies the correct password and rejects the wrong one", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("Tr0ub4dor&3", hash)).toBe(false);
  });

  it("returns false on the dummy path but still performs a comparison", () => {
    // Unknown email / OAuth-only account: the miss must not short-circuit
    // (timing attack defence), and must never authenticate.
    expect(verifyPasswordOrDummy("anything", null)).toBe(false);
    expect(verifyPasswordOrDummy("anything", undefined)).toBe(false);
    expect(verifyPasswordOrDummy("anything", "")).toBe(false);

    const hash = hashPassword("right-password");
    expect(verifyPasswordOrDummy("right-password", hash)).toBe(true);
    expect(verifyPasswordOrDummy("wrong-password", hash)).toBe(false);
  });
});
