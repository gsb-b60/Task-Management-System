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
  /** Kanban status mapped at import time; explicit imports always use TODO. */
  status: "TODO" | "IN_PROGRESS" | "DONE";
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

/**
 * Bulk-add path: one fresh project plus its repository row, atomically — a
 * `githubId` clash rolls the project back too, so a skip never orphans a
 * project. The project number comes from the user's counter (never reused);
 * a number clash from racing creators retries, while a `githubId` clash
 * means "already linked".
 */
export async function createProjectWithRepository(
  userId: string,
  project: { name: string; description: string | null },
  repository: NewGitHubRepositoryData,
  attempts = 5,
): Promise<{ projectId: string; repositoryId: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { projectSeq: true },
      });
      const created = await tx.project.create({
        data: {
          userId,
          name: project.name,
          description: project.description,
          startDate: null,
          targetDate: null,
          projectNumber: user.projectSeq,
        },
        select: { id: true },
      });
      const linked = await tx.gitHubRepository.create({
        data: { ...repository, projectId: created.id },
        select: { id: true },
      });
      await tx.user.update({
        where: { id: userId },
        data: { projectSeq: user.projectSeq + 1 },
      });
      return { projectId: created.id, repositoryId: linked.id };
    });
    return result;
  } catch (error) {
    if (isUniqueViolation(error, "githubId")) {
      throw new AppError("CONFLICT", "This repository is already linked to another project.");
    }
    if (
      attempts > 1 &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return createProjectWithRepository(userId, project, repository, attempts - 1);
    }
    throw error;
  }
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
      // §4 status independence for explicit imports; bulk imports carry the
      // mapped status on the issue itself.
      status: issue.status,
      priority: "MEDIUM",
      startDate: null,
      dueDate: null,
    })),
    skipDuplicates: true,
  });
}
