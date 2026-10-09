// Business rules for accounts and sessions (Phase 01).
//
// No HTTP here: the service returns domain objects and throws AppError;
// cookies and status codes are the presentation layer's job.
import { AppError } from "../lib/errors.js";
import {
  createSession,
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  findSessionWithUserByTokenHash,
} from "../repository/session.repository.js";
import {
  createUser,
  findUserByGitHubId,
  findUserByEmail,
  linkUserGitHub,
} from "../repository/user.repository.js";
import type { AuthUser, SessionUser, UserRow } from "../types/domain.js";
import { hashPassword, verifyPasswordOrDummy } from "./password.js";
import {
  generateSessionToken,
  hashSessionToken,
  sessionExpiry,
} from "./token.js";

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string | null | undefined;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface IssuedSession {
  user: AuthUser;
  /** The raw token — handed to the client in a cookie and never stored. */
  token: string;
}

export interface GitHubProfile {
  githubId: string;
  githubLogin: string;
  email: string | null;
  name: string | null;
  /** Server-side only — stored on the user, never returned (Phase 01 §5.6). */
  accessToken: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
  };
}

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
  };
}

async function issueSession(userId: string): Promise<string> {
  // Lazy cleanup of expired rows, piggybacked on a write that already happens.
  await deleteExpiredSessions(new Date());

  const token = generateSessionToken();
  await createSession({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt: sessionExpiry(),
  });
  return token;
}

export async function register(input: RegisterInput): Promise<IssuedSession> {
  const user = await createUser({
    email: normalizeEmail(input.email),
    passwordHash: hashPassword(input.password),
    displayName: input.displayName ?? null,
  });
  const token = await issueSession(user.id);
  return { user: toAuthUser(user), token };
}

export async function login(input: LoginInput): Promise<IssuedSession> {
  const user = await findUserByEmail(normalizeEmail(input.email));
  // One code path for "no such account" and "wrong password", dummy hash
  // included, so the two failures cost the same time (Phase 01 §4.2).
  const passwordMatches = verifyPasswordOrDummy(input.password, user?.passwordHash);

  if (user === null || !passwordMatches) {
    throw new AppError("UNAUTHENTICATED", "Invalid email or password.", []);
  }

  const token = await issueSession(user.id);
  return { user: toAuthUser(user), token };
}

/** Idempotent: an absent token is a successful logout (Phase 01 §5.3). */
export async function logout(token: string | undefined): Promise<void> {
  if (token === undefined) return;
  await deleteSessionByTokenHash(hashSessionToken(token));
}

/** Returns `null` for missing, expired, or revoked sessions. */
export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const tokenHash = hashSessionToken(token);
  const session = await findSessionWithUserByTokenHash(tokenHash);

  if (session === null) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteSessionByTokenHash(tokenHash);
    return null;
  }

  return toSessionUser(session.user);
}

/**
 * GitHub linking rules, all three cases (Phase 01 §5.6):
 * already linked → log in; email matches → link; otherwise → new OAuth user.
 */
export async function linkGitHubUser(profile: GitHubProfile): Promise<IssuedSession> {
  if (profile.githubId === "" || profile.githubLogin === "") {
    throw new AppError("VALIDATION_ERROR", "GitHub returned an unusable profile.");
  }

  const existing = await findUserByGitHubId(profile.githubId);
  if (existing !== null) {
    // Refresh the stored token: it may have expired, been revoked, or never
    // been persisted (re-connect must heal, not just log in).
    const refreshed = await linkUserGitHub(existing.id, {
      githubId: profile.githubId,
      githubLogin: profile.githubLogin,
      githubAccessToken: profile.accessToken,
    });
    const token = await issueSession(refreshed.id);
    return { user: toAuthUser(refreshed), token };
  }

  if (profile.email !== null && profile.email !== "") {
    const byEmail = await findUserByEmail(normalizeEmail(profile.email));
    if (byEmail !== null) {
      const linked = await linkUserGitHub(byEmail.id, {
        githubId: profile.githubId,
        githubLogin: profile.githubLogin,
        githubAccessToken: profile.accessToken,
      });
      const token = await issueSession(linked.id);
      return { user: toAuthUser(linked), token };
    }
  }

  const created = await createUser({
    email: profile.email ?? `${profile.githubLogin}@users.noreply.github.com`,
    passwordHash: null,
    displayName: profile.name ?? profile.githubLogin,
  });
  const linked = await linkUserGitHub(created.id, {
    githubId: profile.githubId,
    githubLogin: profile.githubLogin,
    githubAccessToken: profile.accessToken,
  });
  const token = await issueSession(linked.id);
  return { user: toAuthUser(linked), token };
}
