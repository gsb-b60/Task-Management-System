// OpenAPI generation (Phase 10 §7). The operations table below each feature's
// routes is the annotation layer; this module turns those annotations plus the
// existing Zod schemas into an OpenAPI 3.1 document. `z.toJSONSchema` converts
// request schemas from their *input* side, so `.transform` targets (dates) are
// documented as the strings the client actually sends.
//
// The parity test (test/openapi.test.ts) walks Express's registered routes and
// fails if the two lists ever diverge — an undocumented endpoint is a red
// build, not a review comment.
import { z } from "zod";
import { ERROR_CODES } from "../../lib/errors.js";

export type TagName =
  | "Auth"
  | "Tasks"
  | "Projects"
  | "Dashboard"
  | "GitHub"
  | "Health"
  | "Docs";

export interface OperationParam {
  name: string;
  in: "path" | "query";
  required?: boolean;
  description?: string;
  schema: unknown;
}

export interface ResponseSpec {
  status: number;
  description: string;
  schema?: unknown;
}

export interface OperationSpec {
  tag: TagName;
  summary: string;
  description?: string;
  auth: boolean;
  params?: OperationParam[];
  requestBody?: { description?: string; schema: z.ZodType };
  responses: ResponseSpec[];
}

export const TAGS: { name: TagName; description: string }[] = [
  { name: "Auth", description: "Registration, sessions, and GitHub sign-in" },
  { name: "Tasks", description: "Task CRUD, search, filter, and pagination" },
  { name: "Projects", description: "Project CRUD and their task counts" },
  { name: "Dashboard", description: "Aggregates for the dashboard tiles" },
  { name: "GitHub", description: "Repositories, issues, and issue import" },
  { name: "Health", description: "Liveness and readiness probes" },
  { name: "Docs", description: "This document and its Swagger UI" },
];

const STATUS_DESCRIPTIONS: Record<number, string> = {
  400: "Validation error (error envelope)",
  401: "Unauthenticated (error envelope)",
  403: "Forbidden (error envelope)",
  404: "Not found (error envelope)",
  409: "Conflict (error envelope)",
  422: "Unprocessable (error envelope)",
  428: "Precondition failed (error envelope)",
  429: "Rate limited (error envelope)",
  500: "Internal error (error envelope)",
  502: "Bad gateway (error envelope)",
};

export const ERROR_ENVELOPE_REF = { $ref: "#/components/schemas/ErrorEnvelope" };

/** Shared error responses, all pointing at the one envelope schema. */
export function errors(...statuses: number[]): ResponseSpec[] {
  return statuses.map((status) => ({
    status,
    description: STATUS_DESCRIPTIONS[status] ?? "Error (error envelope)",
    schema: ERROR_ENVELOPE_REF,
  }));
}

/** `{ data: item }`. */
export function envelope(item: unknown): Record<string, unknown> {
  return { type: "object", required: ["data"], properties: { data: item } };
}

/** `{ data: item[] }`. */
export function listEnvelope(item: unknown): Record<string, unknown> {
  return envelope({ type: "array", items: item });
}

export const PAGINATION_META_SCHEMA = {
  type: "object",
  required: ["page", "pageSize", "totalItems", "totalPages", "hasNextPage", "hasPreviousPage"],
  properties: {
    page: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100 },
    totalItems: { type: "integer", minimum: 0 },
    totalPages: { type: "integer", minimum: 0 },
    hasNextPage: { type: "boolean" },
    hasPreviousPage: { type: "boolean" },
  },
} as const;

/** `{ data: item[], meta }`. */
export function pageEnvelope(item: unknown): Record<string, unknown> {
  return {
    type: "object",
    required: ["data", "meta"],
    properties: { data: { type: "array", items: item }, meta: PAGINATION_META_SCHEMA },
  };
}

export function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  // `unrepresentable: "any"` keeps serving the spec ahead of crashing on a
  // type JSON Schema has no keyword for — the endpoint must never 500.
  const generated = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown>;
  delete generated["$schema"];
  return generated;
}

function buildOperation(spec: OperationSpec): Record<string, unknown> {
  const operation: Record<string, unknown> = {
    summary: spec.summary,
    tags: [spec.tag],
    responses: Object.fromEntries(
      spec.responses.map((response) => [
        String(response.status),
        {
          description: response.description,
          ...(response.schema !== undefined
            ? { content: { "application/json": { schema: response.schema } } }
            : {}),
        },
      ]),
    ),
  };
  if (spec.description !== undefined) operation["description"] = spec.description;
  if (spec.auth) operation["security"] = [{ sessionCookie: [] }];

  const params = (spec.params ?? []).map((param) => ({
    name: param.name,
    in: param.in,
    required: param.in === "path" ? true : (param.required ?? false),
    ...(param.description !== undefined ? { description: param.description } : {}),
    schema: param.schema,
  }));
  if (params.length > 0) operation["parameters"] = params;

  if (spec.requestBody !== undefined) {
    const body: Record<string, unknown> = {
      required: true,
      content: { "application/json": { schema: jsonSchema(spec.requestBody.schema) } },
    };
    if (spec.requestBody.description !== undefined) {
      body["description"] = spec.requestBody.description;
    }
    operation["requestBody"] = body;
  }
  return operation;
}

const ERROR_ENVELOPE = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string", enum: Object.keys(ERROR_CODES) },
        message: { type: "string" },
        details: {
          type: "array",
          items: {
            type: "object",
            required: ["field", "message"],
            properties: {
              field: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

export function buildOpenApiDocument(
  operations: Record<string, OperationSpec>,
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [key, spec] of Object.entries(operations)) {
    const separator = key.indexOf(" ");
    const method = key.slice(0, separator).toLowerCase();
    const path = key
      .slice(separator + 1)
      .replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    paths[path] ??= {};
    paths[path][method] = buildOperation(spec);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "todogit API",
      version: "1.0.0",
      description:
        "Git Project Manager REST API. All endpoints return the shared error " +
        "envelope on failure. Dates are ISO-8601; list endpoints return " +
        "`data` plus pagination `meta`.",
    },
    servers: [{ url: "http://localhost:5004", description: "Local development" }],
    tags: TAGS,
    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "gpm_session",
          description: "HttpOnly session cookie issued by login or GitHub sign-in.",
        },
      },
      schemas: { ErrorEnvelope: ERROR_ENVELOPE },
    },
    paths,
  };
}
