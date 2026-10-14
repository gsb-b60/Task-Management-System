// The session lives in an HttpOnly cookie, so no middleware parses it —
// reading one header is cheaper than a dependency. Setting a cookie uses
// Express's own `res.cookie`, which needs no parser either.
import type { Request, Response } from "express";
import { cookieSecure } from "../config/env.js";

export const SESSION_COOKIE = "gpm_session";

/** 7 days, matching the Session row's expiresAt (Phase 01 §4.3). */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function parseCookieHeader(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name === "") continue;
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function readSessionCookie(req: Request): string | undefined {
  const raw = req.headers.cookie;
  if (raw === undefined) return undefined;
  const value = parseCookieHeader(raw)[SESSION_COOKIE];
  return value === undefined || value === "" ? undefined : value;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    // "none" (with Secure in production) because the SPA and the API live
    // on different hosts (both *.onrender.com, which is on the Public
    // Suffix List, so they are cross-site). Browsers withhold Lax cookies
    // on cross-site fetch, which makes every authenticated XHR 401 even
    // though sign-in itself succeeds.
    sameSite: "none",
    secure: cookieSecure,
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "none",
    secure: cookieSecure,
    path: "/",
    maxAge: 0,
  });
}
