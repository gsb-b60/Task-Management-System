// GitHub OAuth HTTP exchange (Phase 01 §5.5–5.6). The `redirect_uri` is the
// configured callback — never request input, so this endpoint cannot be used
// as an open redirect. Tokens stay server-side.
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import type { GitHubProfile } from "./auth.service.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API = "https://api.github.com";

export function isGitHubOAuthConfigured(): boolean {
  return env.GITHUB_CLIENT_ID !== "" && env.GITHUB_CLIENT_SECRET !== "";
}

export function buildAuthorizeUrl(state?: string): string {
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL);
  url.searchParams.set("scope", "read:user user:email");
  if (state !== undefined && state !== "") {
    url.searchParams.set("state", state);
  }
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!isGitHubOAuthConfigured()) {
    throw new AppError("VALIDATION_ERROR", "GitHub OAuth is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_CALLBACK_URL,
      }),
    });
  } catch {
    throw new AppError("UNAUTHENTICATED", "GitHub sign-in failed.");
  }

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
  };

  if (!response.ok || payload.access_token === undefined || payload.access_token === "") {
    throw new AppError("UNAUTHENTICATED", "Invalid or expired GitHub code.");
  }

  return payload.access_token;
}

interface GitHubUserResponse {
  id?: number;
  login?: string;
  name?: string | null;
  email?: string | null;
}

interface GitHubEmailResponse {
  email?: string;
  primary?: boolean;
  verified?: boolean;
}

async function githubGet<T>(path: string, accessToken: string): Promise<T | null> {
  try {
    const response = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Profile plus access token. The token is stored, never serialised. */
export async function fetchGitHubProfile(accessToken: string): Promise<GitHubProfile> {
  const user = await githubGet<GitHubUserResponse>("/user", accessToken);
  if (user === null || typeof user.id !== "number" || typeof user.login !== "string") {
    throw new AppError("VALIDATION_ERROR", "GitHub returned an unusable profile.");
  }

  let email = typeof user.email === "string" && user.email !== "" ? user.email : null;
  if (email === null) {
    const emails = await githubGet<GitHubEmailResponse[]>("/user/emails", accessToken);
    const primary = emails?.find((entry) => entry.primary === true && entry.verified === true);
    if (primary?.email !== undefined && primary.email !== "") email = primary.email;
  }

  return {
    githubId: String(user.id),
    githubLogin: user.login,
    email,
    name: typeof user.name === "string" && user.name !== "" ? user.name : null,
    accessToken,
  };
}
