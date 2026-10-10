import { createProjectBody, createProjectsFromGitHubBody, updateProjectBody } from "./projects.schemas.js";
import { envelope, errors, listEnvelope, type OperationSpec } from "../openapi/openapi.js";

const projectSchema = {
  type: "object",
  required: ["id", "name", "projectNumber", "taskCount", "completedTaskCount", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", maxLength: 200 },
    description: { type: "string", nullable: true },
    startDate: { type: "string", format: "date-time", nullable: true },
    targetDate: { type: "string", format: "date-time", nullable: true },
    projectNumber: { type: "integer", minimum: 1, description: "Stable per-user index, shown as #N" },
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

const fromGitHubResultSchema = {
  type: "object",
  required: ["created", "skipped"],
  properties: {
    created: {
      type: "array",
      items: {
        type: "object",
        required: ["project", "repository", "importedCount"],
        properties: {
          project: projectSchema,
          repository: {
            type: "object",
            required: ["githubId", "name", "fullName", "owner", "visibility"],
            properties: {
              githubId: { type: "string" },
              name: { type: "string" },
              fullName: { type: "string" },
              owner: { type: "string" },
              description: { type: "string", nullable: true },
              visibility: { type: "string", enum: ["public", "private"] },
              defaultBranch: { type: "string", nullable: true },
              url: { type: "string", nullable: true },
            },
          },
          importedCount: { type: "integer", minimum: 0, description: "Issues imported with this project" },
        },
      },
    },
    skipped: {
      type: "array",
      items: {
        type: "object",
        required: ["githubId", "reason"],
        properties: {
          githubId: { type: "string" },
          reason: { type: "string", enum: ["ALREADY_LINKED", "NOT_ACCESSIBLE"] },
        },
      },
    },
  },
} as const;

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
  "POST /api/projects/from-github": {
    tag: "Projects",
    summary: "Create one project per GitHub repository",
    description:
      "Each item verifies access with the caller's token, then creates the project " +
      "and links the repository atomically. Duplicates and inaccessible repos are " +
      "skipped per item, never failing their siblings. 201 when anything was " +
      "created, 200 when every item was skipped.",
    auth: true,
    requestBody: { schema: createProjectsFromGitHubBody },
    responses: [
      { status: 201, description: "Created and skipped items", schema: envelope(fromGitHubResultSchema) },
      { status: 200, description: "Every item was skipped", schema: envelope(fromGitHubResultSchema) },
      ...errors(400, 401, 428),
    ],
  },
  "GET /api/projects/:id": {    tag: "Projects",
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
