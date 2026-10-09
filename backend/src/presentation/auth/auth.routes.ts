import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import {
  githubAuthorize,
  githubCallback,
  login,
  logout,
  me,
  register,
} from "./auth.controller.js";

export const authRouter: Router = Router();

// 5 attempts / 15 min on register, 10 / 15 min on login (Phase 01 §6.3).
authRouter.post("/api/auth/register", authRateLimit(5), register);
authRouter.post("/api/auth/login", authRateLimit(10), login);
authRouter.post("/api/auth/logout", logout);
authRouter.get("/api/auth/me", requireAuth, me);
authRouter.get("/api/auth/github", githubAuthorize);
authRouter.get("/api/auth/github/callback", githubCallback);
