// Session tokens: 256 bits of randomness, stored only as a SHA-256 digest so a
// database leak cannot be replayed as a session (Phase 01 §4.1, §11).
import { createHash, randomBytes } from "node:crypto";

/** 7 days — matches the cookie's Max-Age of 604800 (Phase 01 §4.3). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + SESSION_TTL_MS);
}
