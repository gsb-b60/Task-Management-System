import { isApiError } from '../api/client'

/**
 * Post-login return paths come from the URL, so they are attacker-controlled.
 * Only same-origin absolute paths are allowed — `//evil.com` and
 * `https://evil.com` would otherwise turn `/login?redirect=` into an open
 * redirect that ships the user off-site with the session intact.
 */
export function safeRedirect(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback

  // `//host` and `/\host` are protocol-relative URLs, not local paths.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.includes('\n') || raw.includes('\r')) return fallback

  return raw
}

/** Reads `?redirect=` from a search string and sanitises it. */
export function redirectFromSearch(search: string, fallback = '/dashboard'): string {
  return safeRedirect(new URLSearchParams(search).get('redirect'), fallback)
}

/**
 * A 401 means the session is gone. Any error other than a normal
 * unauthenticated state is rethrown so callers can surface it.
 */
export function isUnauthenticated(error: unknown): boolean {
  return isApiError(error) && error.status === 401
}