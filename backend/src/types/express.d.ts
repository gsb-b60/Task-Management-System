import type { SessionUser } from "./domain.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth`; absent on public routes. */
      user?: SessionUser;
    }
  }
}

export {};
