// The leak boundary for tasks (architecture-backend.md §7): a row enters, a
// DTO leaves, and `userId` — plus any column a client has no business seeing —
// has no path to the response body.
import type {
  DashboardSummary,
  TaskDto,
  TaskRow,
  TaskStatus,
  TaskSummaryDto,
} from "../types/domain.js";
import { daysUntilDue, isOverdue } from "./dueDate.js";

export function toTaskDto(row: TaskRow): TaskDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startDate: row.startDate,
    dueDate: row.dueDate,
    projectId: row.projectId,
    githubIssueNumber: row.githubIssueNumber,
    githubState: row.githubState,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toTaskSummaryDto(row: TaskRow, now: Date): TaskSummaryDto | null {
  if (row.dueDate === null) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    isOverdue: isOverdue(row.dueDate, row.status, now),
    daysUntilDue: daysUntilDue(row.dueDate, now),
  };
}

/** Every status key is present, so a stat tile renders `0`, never blank. */
export function buildSummary(
  byStatus: { status: TaskStatus; count: number }[],
  overdue: number,
  dueToday: number,
): DashboardSummary {
  const counts: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  let total = 0;
  for (const row of byStatus) {
    counts[row.status] = row.count;
    total += row.count;
  }
  return { total, byStatus: counts, overdue, dueToday };
}
