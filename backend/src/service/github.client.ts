// The only place the app talks to api.github.com (Phase 11 §7).
//
// Contract:
// - retries 5xx / network failures twice with exponential backoff, then
//   surfaces `BAD_GATEWAY` (502) — a GitHub outage can crash nothing;
// - `403` + `x-ratelimit-remaining: 0` (and secondary `429`s) surface as
//   `RATE_LIMITED` (429) carrying GitHub's reset timestamp;
// - any other non-2xx surfaces as `GitHubApiError` so the calling service
//   decides what a 404/403 means in its own context;
// - the token is an argument, never a global, and never leaves this module.
import { AppError } from "../lib/errors.js";

const GITHUB_API = "https://api.github.com";
const MAX_ATTEMPTS = 3; // the initial call plus two retries (§7)
const BACKOFF_BASE_MS = 250;
const REQUEST_TIMEOUT_MS = 10_000;
const RATE_LIMIT_WARN_THRESHOLD = 100;

export interface RateLimitInfo {
  remaining: string | null;
  limit: string | null;
  reset: string | null;
}

export interface GitHubCallResult<T> {
  data: T;
  rateLimit: RateLimitInfo;
  /** Path for the next page (`rel="next"` Link), or `null` when complete. */
  next: string | null;
}

/** A non-success GitHub HTTP status that survived the retry policy. */
export class GitHubApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`GitHub responded ${status}.`);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rateLimitError(rateLimit: RateLimitInfo): AppError {
  const seconds = rateLimit.reset === null ? Number.NaN : Number(rateLimit.reset);
  const resetAt =
    Number.isFinite(seconds) && seconds > 0
      ? new Date(seconds * 1000).toISOString()
      : "an unknown time";
  return new AppError("RATE_LIMITED", `GitHub rate limit exceeded. Resets at ${resetAt}.`);
}

export async function githubFetch<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<GitHubCallResult<T>> {
  // Falling out of the loop means every attempt was a network failure or a
  // 5xx — the retry policy is exhausted, so degrade to 502 (§7).
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));
    }

    let response: Response;
    try {
      response = await fetch(`${GITHUB_API}${path}`, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "todogit",
          ...init.headers,
        },
      });
    } catch {
      continue;
    }

    const rateLimit: RateLimitInfo = {
      remaining: response.headers.get("x-ratelimit-remaining"),
      limit: response.headers.get("x-ratelimit-limit"),
      reset: response.headers.get("x-ratelimit-reset"),
    };
    if (response.status === 429 || (response.status === 403 && rateLimit.remaining === "0")) {
      throw rateLimitError(rateLimit);
    }
    if (response.status >= 500) {
      continue;
    }
    if (!response.ok) {
      throw new GitHubApiError(response.status);
    }

    if (rateLimit.remaining !== null && Number(rateLimit.remaining) < RATE_LIMIT_WARN_THRESHOLD) {
      console.warn(`GitHub rate limit low: ${rateLimit.remaining} requests remaining.`);
    }

    const data = (response.status === 204 ? undefined : await response.json()) as T;
    return { data, rateLimit, next: nextPagePath(response.headers.get("link")) };
  }

  throw new AppError("BAD_GATEWAY", "GitHub is unavailable. Please try again later.");
}

/**
 * The path of the `rel="next"` Link header, relative to the API root so it
 * feeds straight back into {@link githubFetch}. `null` when there is no
 * next page (or no pagination at all).
 */
function nextPagePath(linkHeader: string | null): string | null {
  if (linkHeader === null) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    const url = match?.[1]?.trim();
    if (url === undefined || url === "") continue;
    return url.startsWith(GITHUB_API) ? url.slice(GITHUB_API.length) : url;
  }
  return null;
}

const MAX_PAGES = 10;

/**
 * Collects every page of a listing endpoint (up to {@link MAX_PAGES}).
 * Returns the concatenated items and the last page's rate-limit info.
 */
export async function githubFetchAll<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<GitHubCallResult<T[]>> {
  const data: T[] = [];
  let next: string | null = path;
  let rateLimit: RateLimitInfo = { remaining: null, limit: null, reset: null };
  for (let page = 0; page < MAX_PAGES && next !== null; page += 1) {
    const result: GitHubCallResult<T[]> = await githubFetch(token, next, init);
    data.push(...result.data);
    rateLimit = result.rateLimit;
    next = result.next;
  }
  return { data, rateLimit, next };
}
