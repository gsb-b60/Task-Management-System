import { createTaskBody, updateTaskBody } from "./tasks.schemas.js";
import { envelope, errors, pageEnvelope, type OperationSpec } from "../openapi/openapi.js";

const taskSchema = {
  type: "object",
  required: ["id", "title", "status", "priority", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string", maxLength: 200 },
    description: { type: "string", nullable: true },
    status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    startDate: { type: "string", format: "date-time", nullable: true },
    dueDate: { type: "string", format: "date-time", nullable: true },
    projectId: { type: "string", format: "uuid", nullable: true },
    githubIssueNumber: { type: "integer", nullable: true },
    githubState: { type: "string", enum: ["open", "closed"], nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

const ID_PARAM = {
  name: "id",
  in: "path" as const,
  required: true,
  description: "Task id",
  schema: { type: "string", format: "uuid" },
};

export const TASKS_OPERATIONS: Record<string, OperationSpec> = {
  "GET /api/tasks": {
    tag: "Tasks",
    summary: "List tasks",
    description:
      "Search, filter, sort, and paginate the caller's tasks. Filters compose; " +
      "`status` and `priority` accept repeated or comma-separated values.",
    auth: true,
    params: [
      { name: "q", in: "query", description: "Case-insensitive title search", schema: { type: "string", maxLength: 200 } },
      { name: "status", in: "query", description: "Comma-separated: TODO, IN_PROGRESS, DONE", schema: { type: "string" } },
      { name: "priority", in: "query", description: "Comma-separated: LOW, MEDIUM, HIGH", schema: { type: "string" } },
      { name: "projectId", in: "query", description: "Scope to one project", schema: { type: "string", format: "uuid" } },
      { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
      { name: "pageSize", in: "query", description: "Clamped to 100", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      { name: "sortBy", in: "query", schema: { type: "string", enum: ["dueDate", "createdAt", "updatedAt", "priority", "status", "title"], default: "dueDate" } },
      { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
    ],
    responses: [
      { status: 200, description: "A page of tasks", schema: pageEnvelope(taskSchema) },
      ...errors(400, 401, 404),
    ],
  },
  "POST /api/tasks": {
    tag: "Tasks",
    summary: "Create a task",
    auth: true,
    requestBody: { schema: createTaskBody },
    responses: [
      { status: 201, description: "Created task", schema: envelope(taskSchema) },
      ...errors(400, 401, 404),
    ],
  },
  "GET /api/tasks/:id": {
    tag: "Tasks",
    summary: "Read one task",
    auth: true,
    params: [ID_PARAM],
    responses: [
      { status: 200, description: "The task", schema: envelope(taskSchema) },
      ...errors(401, 404),
    ],
  },
  "PATCH /api/tasks/:id": {
    tag: "Tasks",
    summary: "Update a task",
    description: "Partial update; an empty body is a no-op that returns the task unchanged.",
    auth: true,
    params: [ID_PARAM],
    requestBody: { schema: updateTaskBody },
    responses: [
      { status: 200, description: "The updated task", schema: envelope(taskSchema) },
      ...errors(400, 401, 404),
    ],
  },
  "DELETE /api/tasks/:id": {
    tag: "Tasks",
    summary: "Delete a task",
    auth: true,
    params: [ID_PARAM],
    responses: [{ status: 204, description: "Deleted" }, ...errors(401, 404)],
  },
};
