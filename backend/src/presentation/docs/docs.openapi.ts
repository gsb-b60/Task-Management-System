import type { OperationSpec } from "../openapi/openapi.js";

export const DOCS_OPERATIONS: Record<string, OperationSpec> = {
  "GET /api/openapi.json": {
    tag: "Docs",
    summary: "This OpenAPI document",
    auth: false,
    responses: [
      {
        status: 200,
        description: "OpenAPI 3.1 specification",
        schema: { type: "object" },
      },
    ],
  },
  "GET /api/docs": {
    tag: "Docs",
    summary: "Swagger UI",
    description: "Self-hosted Swagger UI reading /api/openapi.json.",
    auth: false,
    responses: [{ status: 200, description: "HTML page" }],
  },
};
