import { importIssuesBody, linkRepositoryBody } from "./github.schemas.js";
import { envelope, errors, listEnvelope, type OperationSpec } from "../openapi/openapi.js";

const repositorySchema = {
  type: "object",
  required: ["githubId", "name", "fullName", "owner", "visibility"],
  description: "`githubId` is a string — GitHub ids exceed 2^53 and must not round-trip as numbers.",
  properties: {
    githubId: { type: "string", description: "GitHub repository id as a decimal string" },
    name: { type: "string" },
    fullName: { type: "string", description: "owner/name" },
    owner: { type: "string" },
    description: { type: "string", nullable: true },
    visibility: { type: "string", enum: ["public", "private"] },
    defaultBranch: { type: "string", nullable: true },
    url: { type: "string", nullable: true },
  },
} as const;

const issueSchema = {
  type: "object",
  required: ["number", "title", "state", "labels", "author", "createdAt", "updatedAt", "url"],
  properties: {
    number: { type: "integer" },
    title: { type: "string" },
    body: { type: "string", nullable: true },
    state: { type: "string", enum: ["open", "closed"] },
    labels: { type: "array", items: { type: "string" } },
    author: {
      type: "object",
      required: ["login", "avatarUrl"],
      properties: {
        login: { type: "string" },
        avatarUrl: { type: "string", nullable: true },
      },
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    url: { type: "string" },
  },
} as const;

const importResultSchema = {
  type: "object",
  required: ["imported", "skipped"],
  properties: {
    imported: { type: "array", items: { type: "integer" } },
    skipped: { type: "array", items: { type: "integer" } },
  },
} as const;

const PROJECT_ID_PARAM = {
  name: "id",
  in: "path" as const,
  required: true,
  description: "Project id",
  schema: { type: "string", format: "uuid" },
};

const GITHUB_ID_PARAM = {
  name: "githubId",
  in: "path" as const,
  required: true,
  description: "GitHub repository id",
  schema: { type: "string", pattern: "^\\d+$" },
};

// GitHub-facing endpoints can surface transport-level failures too: the
// client maps rate limits to 429 and exhausted retries to 502.
const GITHUB_TRANSPORT_ERRORS = [429, 502];

export const GITHUB_OPERATIONS: Record<string, OperationSpec> = {
  "GET /api/github/repositories": {
    tag: "GitHub",
    summary: "List the caller's repositories",
    description: "First page only (per_page=30, sort=updated). No pagination crawl.",
    auth: true,
    responses: [
      { status: 200, description: "Repositories visible to the linked account", schema: listEnvelope(repositorySchema) },
      ...errors(401, 428, ...GITHUB_TRANSPORT_ERRORS),
    ],
  },
  "GET /api/github/repositories/:githubId/issues": {
    tag: "GitHub",
    summary: "List a repository's issues",
    description: "Pull requests are excluded. `state` is GitHub's state and never the Kanban status.",
    auth: true,
    params: [
      GITHUB_ID_PARAM,
      { name: "state", in: "query", schema: { type: "string", enum: ["open", "closed", "all"], default: "open" } },
      { name: "labels", in: "query", description: "Comma-separated label filter", schema: { type: "string" } },
      { name: "perPage", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 30 } },
    ],
    responses: [
      { status: 200, description: "Issues", schema: listEnvelope(issueSchema) },
      ...errors(401, 403, 404, 428, ...GITHUB_TRANSPORT_ERRORS),
    ],
  },
  "POST /api/projects/:id/github-repository": {
    tag: "GitHub",
    summary: "Associate a project with a repository",
    description: "Verifies the repository is accessible with the caller's token before persisting.",
    auth: true,
    params: [PROJECT_ID_PARAM],
    requestBody: { schema: linkRepositoryBody },
    responses: [
      { status: 200, description: "The associated repository", schema: envelope(repositorySchema) },
      ...errors(400, 401, 403, 404, 409, 428, ...GITHUB_TRANSPORT_ERRORS),
    ],
  },
  "DELETE /api/projects/:id/github-repository": {
    tag: "GitHub",
    summary: "Remove the repository association",
    description: "Imported tasks survive as plain local tasks (SET NULL).",
    auth: true,
    params: [PROJECT_ID_PARAM],
    responses: [{ status: 204, description: "Association removed" }, ...errors(401, 404)],
  },
  "POST /api/projects/:id/import-issues": {
    tag: "GitHub",
    summary: "Import issues as tasks",
    description:
      "Idempotent by (repository, issue number): re-importing skips issues already " +
      "imported. Imported tasks always start as `status: TODO` regardless of GitHub state.",
    auth: true,
    params: [PROJECT_ID_PARAM],
    requestBody: { schema: importIssuesBody },
    responses: [
      { status: 200, description: "Numbers imported and skipped", schema: envelope(importResultSchema) },
      ...errors(400, 401, 404, 422, 428, ...GITHUB_TRANSPORT_ERRORS),
    ],
  },
};
