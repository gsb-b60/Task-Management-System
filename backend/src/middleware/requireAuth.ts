// Verifies the `gpm_session` cookie and attaches the user to the request.
// Auth only — no business rules live here (architecture-backend.md §5).
import type { Request, RequestHandler } from "express";
import { readSessionCookie } from "../lib/cookies.js";
import { AppError } from "../lib/errors.js";
import { getSessionUser } from "../service/index.js";
import type { SessionUser } from "../types/domain.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = readSessionCookie(req);
    if (token === undefined) {
      throw new AppError("UNAUTHENTICATED", "Authentication required.");
    }

    const user = await getSessionUser(token);
    if (user === null) {
      throw new AppError("UNAUTHENTICATED", "Authentication required.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * The signed-in user for a protected handler. Throws 401 rather than lying
 * with `undefined` if a route ever forgets `requireAuth`.
 */
export function currentUser(req: Request): SessionUser {
  const user = req.user;
  if (user === undefined) {
    throw new AppError("UNAUTHENTICATED", "Authentication required.");
  }
  return user;
}
