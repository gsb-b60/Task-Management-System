// User data access. Prisma lives here and nowhere above this layer.
//
// Contract: unique-constraint violations surface as `AppError("CONFLICT")` so
// the service layer never has to recognise Prisma error codes.
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { UserRow } from "../types/domain.js";

export interface NewUserInput {
  email: string;
  passwordHash: string | null;
  displayName: string | null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByGitHubId(githubId: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { githubId } });
}

export async function createUser(input: NewUserInput): Promise<UserRow> {
  try {
    return await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error, "email")) {
      throw new AppError("CONFLICT", "Email is already in use.", [
        { field: "email", message: "Email is already in use." },
      ]);
    }
    throw error;
  }
}

export async function linkUserGitHub(
  userId: string,
  data: { githubId: string; githubLogin: string; githubAccessToken: string },
): Promise<UserRow> {
  try {
    return await prisma.user.update({ where: { id: userId }, data });
  } catch (error) {
    if (isUniqueViolation(error, "githubId")) {
      throw new AppError("CONFLICT", "This GitHub account is already linked.");
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown, target?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  if (target === undefined) return true;
  const meta = error.meta as { target?: unknown } | undefined;
  const fields = Array.isArray(meta?.target) ? meta.target : [meta?.target];
  return fields.some((field) => field === target);
}
