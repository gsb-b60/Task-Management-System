// OpenAPI builder unit tests — the annotation machinery itself (§7.1).
// Pure functions: no HTTP, no database.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildOpenApiDocument,
  envelope,
  errors,
  jsonSchema,
  listEnvelope,
  pageEnvelope,
  type OperationSpec,
} from "../../src/presentation/openapi/openapi.js";

describe("openapi builder (Phase 10 unit)", () => {
  it("maps known error statuses and falls back for unknown ones", () => {
    expect(errors(404)[0]?.description).toBe("Not found (error envelope)");
    expect(errors(404)[0]?.schema).toEqual({ $ref: "#/components/schemas/ErrorEnvelope" });
    expect(errors(418)[0]?.description).toBe("Error (error envelope)");
    expect(errors(401, 404)).toHaveLength(2);
  });

  it("builds a minimal operation without security, params, or body", () => {
    const spec: OperationSpec = {
      tag: "Health",
      summary: "Ping",
      auth: false,
      responses: [{ status: 200, description: "ok" }],
    };
    const doc = buildOpenApiDocument({ "GET /ping": spec });
    const operation = (doc["paths"] as Record<string, Record<string, unknown>>)["/ping"]?.["get"] as Record<string, unknown>;
    expect(operation["security"]).toBeUndefined();
    expect(operation["parameters"]).toBeUndefined();
    expect(operation["requestBody"]).toBeUndefined();
    expect(operation["description"]).toBeUndefined();
    const ok = (operation["responses"] as Record<string, any>)["200"];
    expect(ok["content"]).toBeUndefined();
    expect(ok["description"]).toBe("ok");
  });

  it("builds a full operation: security, params, described body, response schemas", () => {
    const spec: OperationSpec = {
      tag: "Tasks",
      summary: "Create",
      description: "Long description.",
      auth: true,
      params: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
        { name: "flag", in: "query", schema: { type: "boolean" } },
        { name: "forced", in: "query", required: false, description: "desc", schema: { type: "string" } },
      ],
      requestBody: { description: "the body", schema: z.strictObject({ title: z.string() }) },
      responses: [
        { status: 201, description: "made", schema: envelope({ type: "object" }) },
        ...errors(400, 401),
      ],
    };
    const doc = buildOpenApiDocument({ "POST /api/things/:id": spec });
    const paths = doc["paths"] as Record<string, Record<string, any>>;
    const operation = paths["/api/things/{id}"]?.["post"];

    expect(operation?.["security"]).toEqual([{ sessionCookie: [] }]);
    expect(operation?.["description"]).toBe("Long description.");
    const params = operation?.["parameters"] as Record<string, any>[];
    expect(params[0]?.["required"]).toBe(true); // path params are always required
    expect(params[1]?.["required"]).toBe(false);
    expect(params[2]?.["description"]).toBe("desc");
    expect(operation?.["requestBody"]["required"]).toBe(true);
    expect(operation?.["requestBody"]["description"]).toBe("the body");
    expect(operation?.["requestBody"]["content"]["application/json"]["schema"]["additionalProperties"]).toBe(false);
    expect(operation?.["responses"]["201"]["content"]["application/json"]["schema"]["required"]).toEqual(["data"]);
    expect(operation?.["responses"]["400"]).toBeDefined();
  });

  it("converts parameters and stacks multiple methods on one path", () => {
    const base: OperationSpec = {
      tag: "Tasks",
      summary: "x",
      auth: false,
      responses: [{ status: 200, description: "ok" }],
    };
    const doc = buildOpenApiDocument({
      "GET /api/thing": base,
      "POST /api/thing": base,
    });
    const pathItem = (doc["paths"] as Record<string, unknown>)["/api/thing"] as Record<string, unknown>;
    expect(Object.keys(pathItem).sort()).toEqual(["get", "post"]);
    expect(doc["openapi"]).toBe("3.1.0");
    expect((doc["components"] as Record<string, any>)["schemas"]["ErrorEnvelope"]).toBeDefined();
    expect((doc["components"] as Record<string, any>)["securitySchemes"]["sessionCookie"]["name"]).toBe("gpm_session");
    expect(Array.isArray(doc["tags"])).toBe(true);
  });

  it("jsonSchema strips $schema and the envelope helpers shape consistently", () => {
    const plain = jsonSchema(z.object({ a: z.string() }));
    expect(plain["$schema"]).toBeUndefined();

    const strict = jsonSchema(z.strictObject({ a: z.string() }));
    expect(strict["$schema"]).toBeUndefined();
    expect(strict["additionalProperties"]).toBe(false);

    expect(listEnvelope({ type: "string" })["properties"]).toHaveProperty("data");
    const page = pageEnvelope({ type: "string" }) as Record<string, any>;
    expect(Object.keys(page["properties"]).sort()).toEqual(["data", "meta"]);
    expect(page["properties"]["meta"]["required"]).toContain("totalPages");
  });
});
