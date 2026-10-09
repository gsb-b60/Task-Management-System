import type { OperationSpec } from "../openapi/openapi.js";
import { envelope, errors, pageEnvelope } from "../openapi/openapi.js";

const summarySchema = {
  type: "object",
  required: ["total", "byStatus", "overdue", "dueToday"],
  properties: {
    total: { type: "integer", minimum: 0 },
    byStatus: {
      type: "object",
      required: ["TODO", "IN_PROGRESS", "DONE"],
      properties: {
        TODO: { type: "integer", minimum: 0 },
        IN_PROGRESS: { type: "integer", minimum: 0 },
        DONE: { type: "integer", minimum: 0 },
      },
    },
    overdue: { type: "integer", minimum: 0 },
    dueToday: { type: "integer", minimum: 0 },
  },
} as const;

const taskSummarySchema = {
  type: "object",
  required: ["id", "title", "status", "priority", "dueDate", "isOverdue", "daysUntilDue"],
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
    priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    dueDate: { type: "string", format: "date-time" },
    isOverdue: { type: "boolean" },
    daysUntilDue: { type: "integer" },
  },
} as const;

const PROJECT_PARAM = {
  name: "projectId",
  in: "query" as const,
  required: false,
  description: "Scope the aggregate to one owned project",
  schema: { type: "string", format: "uuid" },
};

export const DASHBOARD_OPERATIONS: Record<string, OperationSpec> = {
  "GET /api/dashboard/summary": {
    tag: "Dashboard",
    summary: "Dashboard tile counts",
    description: "Every status key is present — a missing status renders 0, never blank.",
    auth: true,
    params: [PROJECT_PARAM],
    responses: [
      { status: 200, description: "Totals", schema: envelope(summarySchema) },
      ...errors(400, 401, 404),
    ],
  },
  "GET /api/dashboard/upcoming": {
    tag: "Dashboard",
    summary: "Upcoming and overdue tasks",
    description: "Dated, not-done tasks in horizon order, paginated.",
    auth: true,
    params: [
      PROJECT_PARAM,
      { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
      { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
    ],
    responses: [
      { status: 200, description: "A page of summaries", schema: pageEnvelope(taskSummarySchema) },
      ...errors(400, 401, 404),
    ],
  },
};
