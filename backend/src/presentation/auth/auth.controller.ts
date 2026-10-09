// HTTP boundary for authentication: cookies in, status codes out. Every rule
// it needs is in the service; this file only parses, calls, and shapes.
import type { Request, Response } from "express";
import { frontendOrigins } from "../../config/env.js";
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

// Browsers navigating here accept text/html first; fetch and test clients
// accept JSON or */*, so they keep the documented 200/401 envelope while the
// browser leg ends in a redirect back to the SPA (api-data-format: 200 -> 302,
// phase-05 5.4: the callback route "waits for the backend redirect").
function prefersHtml(req: Request): boolean {
  return req.accepts(["json", "html"]) === "html";
}

function spaTarget(pathAndQuery: string): string {
  const origin = frontendOrigins[0] ?? "";
  return `${origin}${pathAndQuery}`;
}

export async function githubCallback(req: Request, res: Response): Promise<void> {
  const html = prefersHtml(req);

  // GitHub sends ?error=... instead of ?code when the user denies consent.
  const rawError: unknown = req.query["error"];
  if (typeof rawError === "string" && rawError !== "") {
    if (html) {
      res.redirect(302, spaTarget(`/auth/github/callback?error=${encodeURIComponent(rawError)}`));
      return;
    }
    throw new AppError("UNAUTHENTICATED", "GitHub authorisation was denied.");
  }

  const rawCode: unknown = req.query["code"];
  const code = typeof rawCode === "string" ? rawCode : "";
  if (code === "") {
    throw new AppError("UNAUTHENTICATED", "Missing or invalid GitHub code.");
  }

  let linked: Awaited<ReturnType<typeof linkGitHubUser>>;
  try {
    const accessToken = await exchangeCodeForToken(code);
    const profile = await fetchGitHubProfile(accessToken);
    linked = await linkGitHubUser(profile);
  } catch (error) {
    if (html) {
      res.redirect(302, spaTarget("/auth/github/callback?error=exchange_failed"));
      return;
    }
    throw error;
  }

  setSessionCookie(res, linked.token);
  if (html) {
    res.redirect(302, spaTarget("/auth/github/callback"));
    return;
  }
  res.status(200).json({ data: linked.user });
}
