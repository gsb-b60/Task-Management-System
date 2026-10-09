// bcrypt, cost from BCRYPT_SALT_ROUNDS (12 by default — Phase 01 §4.2).
//
// The constant-time rule: an unknown email must take the same time as a wrong
// password, so the miss path runs a real bcrypt comparison against a fixed
// cost-12 hash of a throwaway string instead of returning immediately.
import { hashSync, verifySync } from "@node-rs/bcrypt";
import { env } from "../config/env.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$cVA5iWz63F1pHoVZcTMiluWTlOtabjKbf/PoyiXuEStw9gNV2nVd.";

export function hashPassword(plain: string): string {
  return hashSync(plain, { cost: env.BCRYPT_SALT_ROUNDS });
}

export function verifyPassword(plain: string, hash: string): boolean {
  return verifySync(plain, hash);
}

/**
 * Verifies against the stored hash, or against a dummy hash when there is no
 * hash (unknown email, or an OAuth-only account). Returns `false` in the dummy
 * case — the comparison still happened, which is the point.
 */
export function verifyPasswordOrDummy(
  plain: string,
  hash: string | null | undefined,
): boolean {
  if (hash === null || hash === undefined || hash === "") {
    verifySync(plain, DUMMY_PASSWORD_HASH);
    return false;
  }
  return verifySync(plain, hash);
}
