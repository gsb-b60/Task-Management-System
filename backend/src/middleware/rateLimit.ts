// Per-route rate limiting for the auth endpoints (Phase 01 §6.3):
// 5 attempts / 15 min on register, 10 / 15 min on login, keyed by IP + a hash
// of the submitted email — never the email itself, so nothing derived from a
// request body is logged or stored in the limiter's keys.
import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { AppError } from "../lib/errors.js";

function emailFingerprint(req: Request): string {
  const body: unknown = req.body;
  if (typeof body !== "object" || body === null || !("email" in body)) return "-";
  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string" || email === "") return "-";
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

export function authRateLimit(limit: number, windowMs: number = 15 * 60_000): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      `${ipKeyGenerator(req.ip ?? "0.0.0.0")}:${emailFingerprint(req)}`,
    handler: (_req, _res, next) => {
      next(new AppError("RATE_LIMITED", "Too many requests. Please try again later."));
    },
  });
}
