// Project use cases (Phase 08). Every method is scoped by `userId`, taken
// from the session — never from request input. The date rule lives in both
// the schema (full bodies) and here (PATCH merges the body with the stored
// row, so a partial update cannot smuggle in a violating pair).
import { AppError } from "../lib/errors.js";
import {
  countProjectTasks,
  countTasksGroupedByProject,
  createProjectForUser,
  deleteProjectForUser,
  findProjectRowForUser,
  listProjectsForUser,
  updateProjectForUser,
} from "../repository/project.repository.js";
import type { ProjectUpdateData } from "../repository/project.repository.js";
import type { ProjectCounts, ProjectDto } from "../types/domain.js";
import { toProjectDto } from "./projects.mapper.js";

export interface CreateProjectInput {
  name: string;
  description?: string | null | undefined;
  startDate?: Date | null | undefined;
  targetDate?: Date | null | undefined;
}

export interface UpdateProjectInput {
  name?: string | undefined;
  description?: string | null | undefined;
  startDate?: Date | null | undefined;
  targetDate?: Date | null | undefined;
}

function assertDateOrder(startDate: Date | null, targetDate: Date | null): void {
  if (startDate === null || targetDate === null) return;
  if (targetDate.getTime() < startDate.getTime()) {
    throw new AppError("VALIDATION_ERROR", "Request failed validation.", [
      { field: "targetDate", message: "Target date must not be earlier than start date." },
    ]);
  }
}

const NO_TASKS: ProjectCounts = { taskCount: 0, completedTaskCount: 0 };

export async function createProject(
  userId: string,
  input: CreateProjectInput,
): Promise<ProjectDto> {
  const startDate = input.startDate ?? null;
  const targetDate = input.targetDate ?? null;
  assertDateOrder(startDate, targetDate);

  const row = await createProjectForUser(userId, {
    name: input.name,
    description: input.description ?? null,
    startDate,
    targetDate,
  });
  // A brand-new project owns no tasks yet, so the counts are known.
  return toProjectDto(row, NO_TASKS);
}

export async function getProjectById(userId: string, id: string): Promise<ProjectDto> {
  const row = await findProjectRowForUser(id, userId);
  if (row === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  const counts = await countProjectTasks(userId, id);
  return toProjectDto(row, counts);
}

export async function listProjects(userId: string): Promise<ProjectDto[]> {
  const rows = await listProjectsForUser(userId);
  const counts = await countTasksGroupedByProject(userId);
  return rows.map((row) => toProjectDto(row, counts.get(row.id) ?? NO_TASKS));
}

export async function updateProject(
  userId: string,
  id: string,
  patch: UpdateProjectInput,
): Promise<ProjectDto> {
  const existing = await findProjectRowForUser(id, userId);
  if (existing === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }

  // Compare against the stored values for fields the body omits, so patching
  // only `targetDate` cannot smuggle in a pair that violates the order rule.
  const startDate = patch.startDate !== undefined ? patch.startDate : existing.startDate;
  const targetDate = patch.targetDate !== undefined ? patch.targetDate : existing.targetDate;
  assertDateOrder(startDate, targetDate);

  const data: ProjectUpdateData = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.startDate !== undefined) data.startDate = patch.startDate;
  if (patch.targetDate !== undefined) data.targetDate = patch.targetDate;

  // Empty body is a valid no-op (every field optional), not a 404.
  if (Object.keys(data).length === 0) {
    const counts = await countProjectTasks(userId, id);
    return toProjectDto(existing, counts);
  }

  const row = await updateProjectForUser(id, userId, data);
  if (row === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  const counts = await countProjectTasks(userId, id);
  return toProjectDto(row, counts);
}

export async function deleteProject(userId: string, id: string): Promise<void> {
  const removed = await deleteProjectForUser(id, userId);
  if (!removed) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
}
