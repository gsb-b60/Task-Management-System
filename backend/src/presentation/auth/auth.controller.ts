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
  updateProfile as updateProfileService,
  disconnectGitHub as disconnectGitHubService,
} from "../../service/index.js";
import { loginBody, registerBody, updateMeBody } from "./auth.schemas.js";

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

export async function updateMe(req: Request, res: Response): Promise<void> {
  const body = updateMeBody.parse(req.body);
  const user = await updateProfileService(currentUser(req).id, body);
  res.status(200).json({ data: user });
}

export async function disconnectGitHub(req: Request, res: Response): Promise<void> {
  const user = await disconnectGitHubService(currentUser(req).id);
  res.status(200).json({ data: user });
}

export function githubAuthorize(req: Request, res: Response): void {
  // `state` round-trips the SPA return path through GitHub (OAuth §4.1).
  // It is attacker-controlled, so only safe same-origin paths survive —
  // anything else is dropped rather than reflected into a redirect.
  const returnTo = safeReturnPath(req.query["state"] ?? req.query["redirect"]);
  if (!isGitHubOAuthConfigured()) {
    if (prefersHtml(req)) {
      res.redirect(302, spaCallbackTarget({ error: "oauth_not_configured", redirect: returnTo }));
      return;
    }
    throw new AppError("VALIDATION_ERROR", "GitHub OAuth is not configured.");
  }
  res.redirect(302, buildAuthorizeUrl(returnTo ?? undefined));
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

/**
 * Same-origin return paths only — `//evil.com`, `https://evil.com`, and
 * `/\evil` would turn `?state=` into an open redirect that ships the user
 * off-site with the session intact. Returns null for anything unsafe.
 */
function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.includes("\n") || raw.includes("\r")) return null;
  return raw;
}

/** SPA callback URL with the OAuth `state` forwarded as `?redirect=`. */
function spaCallbackTarget(params: { error?: string; redirect?: string | null }): string {
  const search = new URLSearchParams();
  if (params.error !== undefined && params.error !== "") {
    search.set("error", params.error);
  }
  if (params.redirect !== undefined && params.redirect !== null && params.redirect !== "") {
    search.set("redirect", params.redirect);
  }
  const query = search.toString();
  return spaTarget(`/auth/github/callback${query === "" ? "" : `?${query}`}`);
}

export async function githubCallback(req: Request, res: Response): Promise<void> {
  const html = prefersHtml(req);
  // GitHub echoes back the `state` we sent to /api/auth/github. Forward it
  // as `?redirect=` so the SPA lands back where the user started.
  const returnTo = safeReturnPath(req.query["state"] ?? req.query["redirect"]);

  // GitHub sends ?error=... instead of ?code when the user denies consent.
  const rawError: unknown = req.query["error"];
  if (typeof rawError === "string" && rawError !== "") {
    if (html) {
      res.redirect(302, spaCallbackTarget({ error: rawError, redirect: returnTo }));
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
      res.redirect(302, spaCallbackTarget({ error: "exchange_failed", redirect: returnTo }));
      return;
    }
    throw error;
  }

  setSessionCookie(res, linked.token);
  if (html) {
    res.redirect(302, spaCallbackTarget({ redirect: returnTo }));
    return;
  }
  res.status(200).json({ data: linked.user });
}
