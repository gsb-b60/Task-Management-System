// Project data access (Phase 08). Every query carries the `userId` predicate —
// there is no bare-id lookup, so another user's project can never be read,
// updated, or deleted through this module (Phase 08 §10.4).
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type {
  ProjectCounts,
  ProjectRow,
  TaskStatus,
} from "../types/domain.js";

export interface ProjectOwnershipRow {
  id: string;
  userId: string;
}

export interface NewProjectData {
  name: string;
  description: string | null;
  startDate: Date | null;
  targetDate: Date | null;
}

/** Only keys the caller actually sent — `undefined` is never written. */
export interface ProjectUpdateData {
  name?: string;
  description?: string | null;
  startDate?: Date | null;
  targetDate?: Date | null;
}

export async function findProjectForUser(
  id: string,
  userId: string,
): Promise<ProjectOwnershipRow | null> {
  return prisma.project.findFirst({
    where: { id, userId },
    select: { id: true, userId: true },
  });
}

/** Full row for one project, or `null` when it is not the caller's. */
export async function findProjectRowForUser(
  id: string,
  userId: string,
): Promise<ProjectRow | null> {
  return prisma.project.findFirst({ where: { id, userId } });
}

export async function createProjectForUser(
  userId: string,
  data: NewProjectData,
): Promise<ProjectRow> {
  return createNumberedProjectForUser(userId, data);
}

/**
 * Allocates the next per-user project number from `User.projectSeq` and
 * creates the row in one transaction. The counter survives row deletion, so
 * a number is never reused. Concurrent creators can read the same counter —
 * the composite unique turns the loser into a retry, bounded so a hot loop
 * can never spin forever.
 */
export async function createNumberedProjectForUser(
  userId: string,
  data: NewProjectData,
  attempts = 5,
): Promise<ProjectRow> {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { projectSeq: true },
      });
      const row = await tx.project.create({
        data: { ...data, userId, projectNumber: user.projectSeq },
      });
      await tx.user.update({
        where: { id: userId },
        data: { projectSeq: user.projectSeq + 1 },
      });
      return row;
    });
  } catch (error) {
    if (
      attempts > 1 &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return createNumberedProjectForUser(userId, data, attempts - 1);
    }
    throw error;
  }
}

export async function listProjectsForUser(userId: string): Promise<ProjectRow[]> {
  return prisma.project.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export async function updateProjectForUser(
  id: string,
  userId: string,
  data: ProjectUpdateData,
): Promise<ProjectRow | null> {
  const result = await prisma.project.updateMany({ where: { id, userId }, data });
  if (result.count === 0) return null;
  return prisma.project.findFirst({ where: { id, userId } });
}

/** Returns whether a row was removed, so the service can 404 on `false`. */
export async function deleteProjectForUser(id: string, userId: string): Promise<boolean> {
  const result = await prisma.project.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

function emptyCounts(): ProjectCounts {
  return { taskCount: 0, completedTaskCount: 0 };
}

function accumulate(counts: Map<string, ProjectCounts>, row: {
  projectId: string | null;
  status: TaskStatus;
  count: number;
}): void {
  if (row.projectId === null) return;
  const entry = counts.get(row.projectId) ?? emptyCounts();
  entry.taskCount += row.count;
  if (row.status === "DONE") entry.completedTaskCount += row.count;
  counts.set(row.projectId, entry);
}

/**
 * Counts for every project in ONE `groupBy` on `(projectId, status)` — the
 * phase forbids a per-project query (Phase 08 §5.1, Risks: N+1 counts).
 */
export async function countTasksGroupedByProject(
  userId: string,
): Promise<Map<string, ProjectCounts>> {
  const grouped = await prisma.task.groupBy({
    by: ["projectId", "status"],
    where: { userId, projectId: { not: null } },
    _count: { _all: true },
  });

  const counts = new Map<string, ProjectCounts>();
  for (const row of grouped) {
    accumulate(counts, {
      projectId: row.projectId,
      status: row.status,
      count: row._count._all,
    });
  }
  return counts;
}

/** Counts for a single project — one grouped query, not two `count`s. */
export async function countProjectTasks(
  userId: string,
  projectId: string,
): Promise<ProjectCounts> {
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where: { userId, projectId },
    _count: { _all: true },
  });

  const counts = emptyCounts();
  for (const row of grouped) {
    counts.taskCount += row._count._all;
    if (row.status === "DONE") counts.completedTaskCount += row._count._all;
  }
  return counts;
}
