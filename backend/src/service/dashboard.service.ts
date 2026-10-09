// Dashboard aggregates (Phase 04). All counts are scoped to the caller and
// derived from a single grouped status query plus two bounded counts, all read
// against one `now` so the numbers cannot disagree with each other.
import { AppError } from "../lib/errors.js";
import { buildMeta } from "../lib/pagination.js";
import { findProjectForUser } from "../repository/project.repository.js";
import {
  countDueTodayTasksForUser,
  countOverdueTasksForUser,
  countTasksByStatusForUser,
  listTasksForUser,
} from "../repository/task.repository.js";
import type { SortField, SortOrder } from "../repository/task.repository.js";
import type {
  DashboardSummary,
  PaginationMeta,
  TaskPriority,
  TaskStatus,
  TaskSummaryDto,
} from "../types/domain.js";
import { localDayWindow } from "./dueDate.js";
import { buildSummary, toTaskSummaryDto } from "./tasks.mapper.js";

export interface DashboardListQuery {
  q?: string | undefined;
  status?: TaskStatus[] | undefined;
  priority?: TaskPriority[] | undefined;
  projectId?: string | undefined;
  page: number;
  pageSize: number;
  sortBy?: SortField | undefined;
  sortOrder?: SortOrder | undefined;
}

async function assertProjectOwned(projectId: string | undefined, userId: string): Promise<void> {
  if (projectId === undefined) return;
  const project = await findProjectForUser(projectId, userId);
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
}

export async function getSummary(
  userId: string,
  projectId?: string,
  now: Date = new Date(),
): Promise<DashboardSummary> {
  await assertProjectOwned(projectId, userId);

  const { start, end } = localDayWindow(now);
  const [grouped, overdue, dueToday] = await Promise.all([
    countTasksByStatusForUser(userId, projectId),
    countOverdueTasksForUser(userId, start, projectId),
    countDueTodayTasksForUser(userId, start, end, projectId),
  ]);

  return buildSummary(grouped, overdue, dueToday);
}

export async function getUpcoming(
  userId: string,
  query: DashboardListQuery,
  now: Date = new Date(),
): Promise<{ data: TaskSummaryDto[]; meta: PaginationMeta }> {
  await assertProjectOwned(query.projectId, userId);

  const { rows, total } = await listTasksForUser(userId, {
    ...(query.q === undefined ? {} : { q: query.q }),
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.priority === undefined ? {} : { priority: query.priority }),
    ...(query.projectId === undefined ? {} : { projectId: query.projectId }),
    ...(query.sortBy === undefined ? {} : { sortBy: query.sortBy }),
    ...(query.sortOrder === undefined ? {} : { sortOrder: query.sortOrder }),
    page: query.page,
    pageSize: query.pageSize,
    // Due-dated and not finished — completed work is not upcoming.
    upcomingOnly: true,
  });

  const data = rows
    .map((row) => toTaskSummaryDto(row, now))
    .filter((summary): summary is TaskSummaryDto => summary !== null);

  return { data, meta: buildMeta(query.page, query.pageSize, total) };
}
