// GitHub link data access. Prisma lives here and nowhere above this layer.
//
// The association is one repository per project (`projectId @unique`) and one
// project per repository (`githubId @unique`); the unique
// `(githubRepositoryId, githubIssueNumber)` constraint is what makes imports
// idempotent (Phase 11 §13). Unique violations surface as `AppError("CONFLICT")`.
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { GitHubRepositoryRow } from "../types/domain.js";

export interface NewGitHubRepositoryData {
  githubId: bigint;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  visibility: "public" | "private";
  defaultBranch: string | null;
  url: string | null;
}

export interface ImportedIssueData {
  number: number;
  title: string;
  description: string | null;
  state: "open" | "closed";
}

export async function findGitHubRepositoryByProject(
  projectId: string,
): Promise<GitHubRepositoryRow | null> {
  return prisma.gitHubRepository.findUnique({ where: { projectId } });
}

export async function upsertProjectGitHubRepository(
  projectId: string,
  data: NewGitHubRepositoryData,
): Promise<GitHubRepositoryRow> {
  try {
    return await prisma.gitHubRepository.upsert({
      where: { projectId },
      create: { ...data, projectId },
      update: data,
    });
  } catch (error) {
    if (isUniqueViolation(error, "githubId")) {
      throw new AppError("CONFLICT", "This repository is already linked to another project.");
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown, target: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  const meta = error.meta as { target?: unknown } | undefined;
  const fields = Array.isArray(meta?.target) ? meta.target : [meta?.target];
  return fields.some((field) => field === target);
}

/** `SET NULL` on `Task.githubRepositoryId` keeps imported tasks alive (§6.3). */
export async function deleteProjectGitHubRepository(projectId: string): Promise<void> {
  await prisma.gitHubRepository.deleteMany({ where: { projectId } });
}

export async function findExistingIssueNumbers(
  githubRepositoryId: string,
  numbers: number[],
): Promise<Set<number>> {
  const rows = await prisma.task.findMany({
    where: { githubRepositoryId, githubIssueNumber: { in: numbers } },
    select: { githubIssueNumber: true },
  });
  return new Set(rows.flatMap((row) => (row.githubIssueNumber === null ? [] : [row.githubIssueNumber])));
}

/**
 * `skipDuplicates` honours the unique constraint even if two imports race —
 * the caller reports `imported`/`skipped` from its pre-check, which the
 * constraint can only confirm, never contradict.
 */
export async function createImportedTasks(
  userId: string,
  projectId: string,
  githubRepositoryId: string,
  issues: ImportedIssueData[],
): Promise<void> {
  if (issues.length === 0) return;
  await prisma.task.createMany({
    data: issues.map((issue) => ({
      userId,
      projectId,
      githubRepositoryId,
      githubIssueNumber: issue.number,
      githubState: issue.state,
      title: issue.title,
      description: issue.description,
      // §4 status independence: GitHub's state never becomes Kanban status.
      status: "TODO",
      priority: "MEDIUM",
      startDate: null,
      dueDate: null,
    })),
    skipDuplicates: true,
  });
}
