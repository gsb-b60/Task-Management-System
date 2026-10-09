// Serves the artifacts Phase 10 §7 requires: the generated specification at
// GET /api/openapi.json and a self-hosted Swagger UI at GET /api/docs.
// swagger-ui-dist ships plain browser files; they are served from
// node_modules rather than a CDN so /api/docs works offline and in CI.
import { createRequire } from "node:module";
import path from "node:path";
import { Router, static as serveStatic } from "express";
import { buildOpenApiDocument, type OperationSpec } from "../openapi/openapi.js";
import { AUTH_OPERATIONS } from "../auth/auth.openapi.js";
import { DASHBOARD_OPERATIONS } from "../dashboard/dashboard.openapi.js";
import { DOCS_OPERATIONS } from "./docs.openapi.js";
import { GITHUB_OPERATIONS } from "../github/github.openapi.js";
import { HEALTH_OPERATIONS } from "../health/health.openapi.js";
import { PROJECTS_OPERATIONS } from "../projects/projects.openapi.js";
import { TASKS_OPERATIONS } from "../tasks/tasks.openapi.js";

const require = createRequire(import.meta.url);

/** Every operation from every feature, merged for the document and parity. */
export const ALL_OPERATIONS: Record<string, OperationSpec> = {
  ...AUTH_OPERATIONS,
  ...TASKS_OPERATIONS,
  ...PROJECTS_OPERATIONS,
  ...DASHBOARD_OPERATIONS,
  ...GITHUB_OPERATIONS,
  ...HEALTH_OPERATIONS,
  ...DOCS_OPERATIONS,
};

let cached: Record<string, unknown> | undefined;

export function openApiDocument(): Record<string, unknown> {
  cached ??= buildOpenApiDocument(ALL_OPERATIONS);
  return cached;
}

const swaggerUiDir = path.dirname(require.resolve("swagger-ui-dist/package.json"));

const swaggerHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>todogit API docs</title>
  <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/docs/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/api/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true
    });
  </script>
</body>
</html>
`;

export const docsRouter: Router = Router();

docsRouter.get("/api/openapi.json", (_req, res) => {
  res.status(200).json(openApiDocument());
});

docsRouter.get("/api/docs", (_req, res) => {
  res.status(200).type("html").send(swaggerHtml);
});

// Plain assets (swagger-ui.css, swagger-ui-bundle.js, ...) resolved from
// node_modules — exact-path routes above already claimed /api/docs itself.
docsRouter.use(
  "/api/docs",
  serveStatic(swaggerUiDir, { index: false, fallthrough: true }),
);
