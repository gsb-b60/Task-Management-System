// The leak boundary for projects (architecture-backend.md §7): a row enters,
// a DTO leaves, and `userId` has no path to the response body. Counts arrive
// pre-aggregated — the mapper never queries.
import type { ProjectCounts, ProjectDto, ProjectRow } from "../types/domain.js";

export function toProjectDto(row: ProjectRow, counts: ProjectCounts): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.startDate,
    targetDate: row.targetDate,
    taskCount: counts.taskCount,
    completedTaskCount: counts.completedTaskCount,
    createdAt: row.createdAt,
  };
}
