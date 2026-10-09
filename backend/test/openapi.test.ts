// Phase 10 §7: the document must match reality. This test walks Express's
// registered route stack and compares it with the generated spec, so an
// undocumented endpoint (or a documented ghost) fails the build.
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";
import { ALL_OPERATIONS, openApiDocument } from "../src/presentation/docs/docs.routes.js";

interface RouterLayer {
  name: string;
  route?: { path: string | string[]; methods: Record<string, boolean> };
  handle?: { stack?: RouterLayer[] };
}

function expressRoutes(): Set<string> {
  const found = new Set<string>();
  const walk = (stack: RouterLayer[]): void => {
    for (const layer of stack) {
      if (layer.route !== undefined) {
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const routePath of paths) {
          if (typeof routePath !== "string") continue;
          for (const method of Object.keys(layer.route.methods)) {
            found.add(`${method.toUpperCase()} ${routePath}`);
          }
        }
      } else if (layer.name === "router" && layer.handle?.stack !== undefined) {
        walk(layer.handle.stack);
      }
    }
  };
  const stack = (app as unknown as { router: { stack: RouterLayer[] } }).router.stack;
  walk(stack);
  return found;
}

function documentedRoutes(): Set<string> {
  const spec = openApiDocument();
  const found = new Set<string>();
  const paths = spec["paths"] as Record<string, Record<string, unknown>>;
  for (const [openApiPath, methods] of Object.entries(paths)) {
    const expressPath = openApiPath.replace(/\{([^}]+)\}/g, ":$1");
    for (const method of Object.keys(methods)) {
      found.add(`${method.toUpperCase()} ${expressPath}`);
    }
  }
  return found;
}

describe("OpenAPI document — Phase 10 §7", () => {
  beforeAll(async () => {
    // Materialise Express's router before walking its stack.
    await request(app).get("/api/health").expect((res) => {
      expect([200, 503]).toContain(res.status);
    });
  });

  it("documents exactly the registered routes", () => {
    const express = expressRoutes();
    const spec = documentedRoutes();

    const undocumented = [...express].filter((route) => !spec.has(route)).sort();
    const ghosts = [...spec].filter((route) => !express.has(route)).sort();

    expect(undocumented, "routes registered but missing from openapi.json").toEqual([]);
    expect(ghosts, "documented paths with no matching Express route").toEqual([]);
    expect(express.size).toBeGreaterThanOrEqual(25);
  });

  it("every operation is annotated", () => {
    for (const [key, operation] of Object.entries(ALL_OPERATIONS)) {
      expect(key, `${key} must be "METHOD /path"`).toMatch(/^[A-Z]+ \//);
      expect(operation.summary.length, `${key} summary`).toBeGreaterThan(0);
      expect(operation.tag.length, `${key} tag`).toBeGreaterThan(0);
      expect(operation.responses.length, `${key} responses`).toBeGreaterThan(0);
      expect(
        operation.responses.some((response) => response.status < 400),
        `${key} must document a success response`,
      ).toBe(true);
      if (operation.auth) {
        expect(
          operation.responses.some((response) => response.status === 401),
          `${key} authenticated endpoint must document 401`,
        ).toBe(true);
      }
    }
  });

  it("serves a valid 3.1 document at /api/openapi.json", async () => {
    const res = await request(app).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(res.body.info.title).toBe("todogit API");
    // 27 routes across 20 distinct paths (several methods share a path).
    expect(Object.keys(res.body.paths).length).toBeGreaterThanOrEqual(20);
    expect(res.body.components.schemas.ErrorEnvelope).toBeDefined();
    expect(res.body.components.securitySchemes.sessionCookie.name).toBe("gpm_session");

    // Every $ref resolves inside the document.
    const refs: string[] = [];
    const collect = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const child of node) collect(child);
      } else if (typeof node === "object" && node !== null) {
        for (const [key, value] of Object.entries(node)) {
          if (key === "$ref" && typeof value === "string") refs.push(value);
          else collect(value);
        }
      }
    };
    collect(res.body);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith("#/components/")).toBe(true);
      const pointer = ref.slice(2).split("/");
      let cursor: unknown = res.body;
      for (const segment of pointer) {
        expect(cursor, `unresolved $ref ${ref}`).toBeTypeOf("object");
        cursor = (cursor as Record<string, unknown>)[segment];
      }
      expect(cursor, `unresolved $ref ${ref}`).toBeDefined();
    }
  });

  it("documents request bodies and query constraints for key routes", () => {
    const paths = openApiDocument()["paths"] as Record<string, Record<string, any>>;

    const createTask = paths["/api/tasks"]?.["post"];
    expect(createTask.requestBody).toBeDefined();
    expect(createTask.requestBody.content["application/json"].schema.additionalProperties).toBe(false);
    expect(createTask.security).toEqual([{ sessionCookie: [] }]);

    const listTasks = paths["/api/tasks"]?.["get"];
    const paramNames = (listTasks.parameters as { name: string }[]).map((p) => p.name);
    expect(paramNames).toContain("pageSize");
    expect(paramNames).toContain("status");

    const issues = paths["/api/github/repositories/{githubId}/issues"]?.["get"];
    expect(issues).toBeDefined();
    expect(issues.tags).toEqual(["GitHub"]);
  });

  it("serves Swagger UI at /api/docs", async () => {
    const page = await request(app).get("/api/docs");
    expect(page.status).toBe(200);
    expect(page.headers["content-type"]).toContain("text/html");
    expect(page.text).toContain("swagger-ui-bundle.js");
    expect(page.text).toContain("/api/openapi.json");

    const bundle = await request(app).get("/api/docs/swagger-ui-bundle.js");
    expect(bundle.status).toBe(200);

    const css = await request(app).get("/api/docs/swagger-ui.css");
    expect(css.status).toBe(200);
  });
});
