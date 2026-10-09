import { createProjectBody, updateProjectBody } from "./projects.schemas.js";
import { envelope, errors, listEnvelope, type OperationSpec } from "../openapi/openapi.js";

const projectSchema = {
  type: "object",
  required: ["id", "name", "taskCount", "completedTaskCount", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", maxLength: 200 },
    description: { type: "string", nullable: true },
    startDate: { type: "string", format: "date-time", nullable: true },
    targetDate: { type: "string", format: "date-time", nullable: true },
    taskCount: { type: "integer", minimum: 0 },
    completedTaskCount: { type: "integer", minimum: 0 },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

const ID_PARAM = {
  name: "id",
  in: "path" as const,
  required: true,
  description: "Project id",
  schema: { type: "string", format: "uuid" },
};

export const PROJECTS_OPERATIONS: Record<string, OperationSpec> = {
  "GET /api/projects": {
    tag: "Projects",
    summary: "List the caller's projects",
    description: "Includes task counts aggregated in a single groupBy.",
    auth: true,
    responses: [
      { status: 200, description: "All owned projects", schema: listEnvelope(projectSchema) },
      ...errors(401),
    ],
  },
  "POST /api/projects": {
    tag: "Projects",
    summary: "Create a project",
    description: "`targetDate` must not be earlier than `startDate`.",
    auth: true,
    requestBody: { schema: createProjectBody },
    responses: [
      { status: 201, description: "Created project", schema: envelope(projectSchema) },
      ...errors(400, 401),
    ],
  },
  "GET /api/projects/:id": {
    tag: "Projects",
    summary: "Read one project",
    description: "Another user's project is a 404, never a 403.",
    auth: true,
    params: [ID_PARAM],
    responses: [
      { status: 200, description: "The project", schema: envelope(projectSchema) },
      ...errors(401, 404),
    ],
  },
  "PATCH /api/projects/:id": {
    tag: "Projects",
    summary: "Update a project",
    description: "Partial update; the date rule is checked against the stored row.",
    auth: true,
    params: [ID_PARAM],
    requestBody: { schema: updateProjectBody },
    responses: [
      { status: 200, description: "The updated project", schema: envelope(projectSchema) },
      ...errors(400, 401, 404),
    ],
  },
  "DELETE /api/projects/:id": {
    tag: "Projects",
    summary: "Delete a project and its tasks",
    description: "Hard delete; every task in the project is removed with it.",
    auth: true,
    params: [ID_PARAM],
    responses: [{ status: 204, description: "Deleted, tasks cascaded" }, ...errors(401, 404)],
  },
};
