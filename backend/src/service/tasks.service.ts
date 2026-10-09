// Task use cases (Phases 02–03). Every method is scoped by `userId`, taken
// from the session — never from request input. Cross-field rules live here so
// they are testable without HTTP.
import { AppError } from "../lib/errors.js";
import { buildMeta } from "../lib/pagination.js";
import type { PaginationMeta } from "../lib/pagination.js";
import { findProjectForUser } from "../repository/project.repository.js";
import {
  createTaskForUser,
  deleteTaskForUser,
  findTaskForUser,
  listTasksForUser,
  updateTaskForUser,
} from "../repository/task.repository.js";
import type {
  SortField,
  SortOrder,
  TaskUpdateData,
} from "../repository/task.repository.js";
import type { TaskDto, TaskPriority, TaskStatus } from "../types/domain.js";
import { toTaskDto } from "./tasks.mapper.js";

export interface CreateTaskInput {
  title: string;
  description?: string | null | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  startDate?: Date | null | undefined;
  dueDate?: Date | null | undefined;
  projectId?: string | null | undefined;
}

export interface UpdateTaskInput {
  title?: string | undefined;
  description?: string | null | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  startDate?: Date | null | undefined;
  dueDate?: Date | null | undefined;
  projectId?: string | null | undefined;
}

export interface ListTasksQuery {
  q?: string | undefined;
  status?: TaskStatus[] | undefined;
  priority?: TaskPriority[] | undefined;
  projectId?: string | undefined;
  hasDueDate?: boolean | undefined;
  page: number;
  pageSize: number;
  sortBy?: SortField | undefined;
  sortOrder?: SortOrder | undefined;
}

export interface TaskPage {
  data: TaskDto[];
  meta: PaginationMeta;
}

function assertDateOrder(startDate: Date | null, dueDate: Date | null): void {
  if (startDate === null || dueDate === null) return;
  if (dueDate.getTime() < startDate.getTime()) {
    throw new AppError("VALIDATION_ERROR", "Request failed validation.", [
      { field: "dueDate", message: "Due date must not be earlier than start date." },
    ]);
  }
}

/** A `projectId` belonging to someone else is a 404, not a silent no-op. */
async function assertProjectOwned(
  projectId: string | null | undefined,
  userId: string,
): Promise<void> {
  if (projectId === undefined || projectId === null) return;
  const project = await findProjectForUser(projectId, userId);
  if (project === null) {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskDto> {
  await assertProjectOwned(input.projectId, userId);

  const startDate = input.startDate ?? null;
  const dueDate = input.dueDate ?? null;
  assertDateOrder(startDate, dueDate);

  const row = await createTaskForUser(userId, {
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "TODO",
    priority: input.priority ?? "MEDIUM",
    startDate,
    dueDate,
    projectId: input.projectId ?? null,
  });
  return toTaskDto(row);
}

export async function getTaskById(userId: string, id: string): Promise<TaskDto> {
  const row = await findTaskForUser(id, userId);
  if (row === null) {
    throw new AppError("NOT_FOUND", "Task not found.");
  }
  return toTaskDto(row);
}

export async function listTasks(userId: string, query: ListTasksQuery): Promise<TaskPage> {
  await assertProjectOwned(query.projectId, userId);

  const { rows, total } = await listTasksForUser(userId, {
    ...(query.q === undefined ? {} : { q: query.q }),
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.priority === undefined ? {} : { priority: query.priority }),
    ...(query.projectId === undefined ? {} : { projectId: query.projectId }),
    ...(query.hasDueDate === undefined ? {} : { hasDueDate: query.hasDueDate }),
    ...(query.sortBy === undefined ? {} : { sortBy: query.sortBy }),
    ...(query.sortOrder === undefined ? {} : { sortOrder: query.sortOrder }),
    page: query.page,
    pageSize: query.pageSize,
  });

  return {
    data: rows.map(toTaskDto),
    meta: buildMeta(query.page, query.pageSize, total),
  };
}

export async function updateTask(
  userId: string,
  id: string,
  patch: UpdateTaskInput,
): Promise<TaskDto> {
  const existing = await findTaskForUser(id, userId);
  if (existing === null) {
    throw new AppError("NOT_FOUND", "Task not found.");
  }

  if (patch.projectId !== undefined) {
    await assertProjectOwned(patch.projectId, userId);
  }

  // Compare against the stored values for fields the body omits, so patching
  // only `dueDate` cannot smuggle in a pair that violates the order rule.
  const startDate = patch.startDate !== undefined ? patch.startDate : existing.startDate;
  const dueDate = patch.dueDate !== undefined ? patch.dueDate : existing.dueDate;
  assertDateOrder(startDate, dueDate);

  const data: TaskUpdateData = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.startDate !== undefined) data.startDate = patch.startDate;
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate;
  if (patch.projectId !== undefined) data.projectId = patch.projectId;

  // Empty body is a valid no-op (every field optional), not a 404.
  if (Object.keys(data).length === 0) {
    return toTaskDto(existing);
  }

  const row = await updateTaskForUser(id, userId, data);
  if (row === null) {
    throw new AppError("NOT_FOUND", "Task not found.");
  }
  return toTaskDto(row);
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const removed = await deleteTaskForUser(id, userId);
  if (!removed) {
    throw new AppError("NOT_FOUND", "Task not found.");
  }
}
