// HTTP boundary for authentication: cookies in, status codes out. Every rule
// it needs is in the service; this file only parses, calls, and shapes.
import type { Request, Response } from "express";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../../lib/cookies.js";
import { AppError } from "../../lib/errors.js";
import { currentUser } from "../../middleware/requireAuth.js";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchGitHubProfile,
  isGitHubOAuthConfigured,
  linkGitHubUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
} from "../../service/index.js";
import { loginBody, registerBody } from "./auth.schemas.js";

export async function register(req: Request, res: Response): Promise<void> {
  const body = registerBody.parse(req.body);
  const session = await registerService(body);
  setSessionCookie(res, session.token);
  res.status(201).json({ data: session.user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = loginBody.parse(req.body);
  const session = await loginService(body);
  setSessionCookie(res, session.token);
  res.status(200).json({ data: session.user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await logoutService(readSessionCookie(req));
  clearSessionCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: currentUser(req) });
}

export function githubAuthorize(_req: Request, res: Response): void {
  if (!isGitHubOAuthConfigured()) {
    throw new AppError("VALIDATION_ERROR", "GitHub OAuth is not configured.");
  }
  res.redirect(302, buildAuthorizeUrl());
}

export async function githubCallback(req: Request, res: Response): Promise<void> {
  const rawCode: unknown = req.query["code"];
  const code = typeof rawCode === "string" ? rawCode : "";
  if (code === "") {
    throw new AppError("UNAUTHENTICATED", "Missing or invalid GitHub code.");
  }

  const accessToken = await exchangeCodeForToken(code);
  const profile = await fetchGitHubProfile(accessToken);
  const session = await linkGitHubUser(profile);

  setSessionCookie(res, session.token);
  res.status(200).json({ data: session.user });
}
