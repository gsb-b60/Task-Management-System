// Task data access — the single place where task filters are composed
// (Phase 03 §9). Every query carries the `userId` predicate; there is no
// `findUnique({ where: { id } })` anywhere in this file, because a bare id
// lookup would confirm that another user's task exists (Phase 02 §6).
import type { Prisma } from "@prisma/client";
import { skipFor } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import type {
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "../types/domain.js";

export type SortField =
  | "dueDate"
  | "createdAt"
  | "updatedAt"
  | "priority"
  | "status"
  | "title";
export type SortOrder = "asc" | "desc";

export interface TaskListFilters {
  /** Case-insensitive partial match on title. */
  q?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  projectId?: string;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page: number;
  pageSize: number;
  /** Phase 04 §5.2 — `dueDate IS NOT NULL AND status != 'DONE'`. */
  upcomingOnly?: boolean;
}

export interface NewTaskData {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  projectId: string | null;
}

/** Only keys the caller actually sent — `undefined` is never written. */
export interface TaskUpdateData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date | null;
  dueDate?: Date | null;
  projectId?: string | null;
}

function buildWhere(userId: string, filters: TaskListFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { userId };

  if (filters.q !== undefined && filters.q !== "") {
    where.title = { contains: filters.q, mode: "insensitive" };
  }
  if (filters.status !== undefined && filters.status.length > 0) {
    where.status = { in: filters.status };
  }
  if (filters.priority !== undefined && filters.priority.length > 0) {
    where.priority = { in: filters.priority };
  }
  if (filters.projectId !== undefined) {
    where.projectId = filters.projectId;
  }
  if (filters.upcomingOnly === true) {
    // Kept in `AND` so it composes with a caller-supplied `status` filter
    // instead of overwriting it: `?status=DONE` on /upcoming is empty by design.
    where.AND = [{ dueDate: { not: null } }, { status: { not: "DONE" } }];
  }

  return where;
}

function buildOrderBy(sortBy: SortField, sortOrder: SortOrder): Prisma.TaskOrderByWithRelationInput[] {
  const nulls = sortOrder === "asc" ? "last" : "first";
  let primary: Prisma.TaskOrderByWithRelationInput;

  switch (sortBy) {
    case "createdAt":
      primary = { createdAt: sortOrder };
      break;
    case "updatedAt":
      primary = { updatedAt: sortOrder };
      break;
    case "priority":
      primary = { priority: sortOrder };
      break;
    case "status":
      primary = { status: sortOrder };
      break;
    case "title":
      primary = { title: sortOrder };
      break;
    case "dueDate":
    default:
      // Nullable key: undated tasks sort last ascending, first descending,
      // so "no deadline" never dominates the top of the list (Phase 03 §5.3).
      primary = { dueDate: { sort: sortOrder, nulls } };
      break;
  }

  // Stable tiebreaker — without it rows sharing a sort key shift between
  // pages and a task appears twice or vanishes (Phase 03 §5.1).
  return [primary, { id: "asc" }];
}

export async function findTaskForUser(id: string, userId: string): Promise<TaskRow | null> {
  return prisma.task.findFirst({ where: { id, userId } });
}

export async function createTaskForUser(userId: string, data: NewTaskData): Promise<TaskRow> {
  return prisma.task.create({ data: { ...data, userId } });
}

export async function updateTaskForUser(
  id: string,
  userId: string,
  data: TaskUpdateData,
): Promise<TaskRow | null> {
  const result = await prisma.task.updateMany({ where: { id, userId }, data });
  if (result.count === 0) return null;
  return prisma.task.findFirst({ where: { id, userId } });
}

/** Returns whether a row was removed, so the service can 404 on `false`. */
export async function deleteTaskForUser(id: string, userId: string): Promise<boolean> {
  const result = await prisma.task.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

export async function listTasksForUser(
  userId: string,
  filters: TaskListFilters,
): Promise<{ rows: TaskRow[]; total: number }> {
  const where = buildWhere(userId, filters);
  const orderBy = buildOrderBy(filters.sortBy ?? "dueDate", filters.sortOrder ?? "asc");

  const [rows, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy,
      skip: skipFor(filters.page, filters.pageSize),
      take: filters.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return { rows, total };
}

function projectFilter(projectId: string | undefined): Prisma.TaskWhereInput {
  return projectId === undefined ? {} : { projectId };
}

/** Phase 04 §5.1 — one grouped query feeds total and every byStatus count. */
export async function countTasksByStatusForUser(
  userId: string,
  projectId?: string,
): Promise<{ status: TaskStatus; count: number }[]> {
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where: { userId, ...projectFilter(projectId) },
    _count: { _all: true },
  });
  return grouped.map((row) => ({ status: row.status, count: row._count._all }));
}

/** Overdue: due before today's local midnight, and not finished. */
export async function countOverdueTasksForUser(
  userId: string,
  dueBefore: Date,
  projectId?: string,
): Promise<number> {
  return prisma.task.count({
    where: {
      userId,
      ...projectFilter(projectId),
      dueDate: { lt: dueBefore },
      status: { not: "DONE" },
    },
  });
}

/** Due today: inside today's local calendar-day window, any status. */
export async function countDueTodayTasksForUser(
  userId: string,
  from: Date,
  to: Date,
  projectId?: string,
): Promise<number> {
  return prisma.task.count({
    where: {
      userId,
      ...projectFilter(projectId),
      dueDate: { gte: from, lt: to },
    },
  });
}
