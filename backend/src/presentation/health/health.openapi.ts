import type { OperationSpec } from "../openapi/openapi.js";

const healthSchema = {
  type: "object",
  required: ["status"],
  properties: { status: { type: "string", enum: ["ok"] } },
} as const;

const readinessSchema = {
  type: "object",
  required: ["status", "database"],
  properties: {
    status: { type: "string", enum: ["ok", "unavailable"] },
    database: { type: "string", enum: ["connected", "unavailable"] },
  },
} as const;

export const HEALTH_OPERATIONS: Record<string, OperationSpec> = {
  "GET /health": {
    tag: "Health",
    summary: "Liveness probe",
    description: "Process is up. Never touches the database.",
    auth: false,
    responses: [{ status: 200, description: "Alive", schema: healthSchema }],
  },
  "GET /api/health": {
    tag: "Health",
    summary: "Readiness probe",
    description:
      "200 with `database: connected`; 503 when the database is unreachable. " +
      "A 503 body is a condition report, not an error envelope.",
    auth: false,
    responses: [
      { status: 200, description: "Ready", schema: readinessSchema },
      { status: 503, description: "Database unavailable", schema: readinessSchema },
    ],
  },
};
