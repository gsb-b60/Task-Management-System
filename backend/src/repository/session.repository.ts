// Session data access. `Session.token` stores the SHA-256 digest of the token
// the client holds, never the token itself.
import { prisma } from "../lib/prisma.js";
import type { UserRow } from "../types/domain.js";

export interface SessionWithUser {
  id: string;
  expiresAt: Date;
  user: UserRow;
}

export async function createSession(input: {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}): Promise<{ id: string; expiresAt: Date }> {
  return prisma.session.create({
    data: {
      token: input.tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
    },
    select: { id: true, expiresAt: true },
  });
}

export async function findSessionWithUserByTokenHash(
  tokenHash: string,
): Promise<SessionWithUser | null> {
  const session = await prisma.session.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });
  if (session === null) return null;
  const { user, ...rest } = session;
  return { ...rest, user };
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token: tokenHash } });
}

/** Lazy cleanup — expired rows are dropped during normal traffic (Phase 01 §8). */
export async function deleteExpiredSessions(now: Date): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return result.count;
}
