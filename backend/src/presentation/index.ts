// Presentation layer — the HTTP boundary.
//
// Rules:
// - `*.routes.ts` declare paths and middleware, nothing else.
// - `*.controller.ts` parse/validate input, call exactly one service method,
//   choose the status code, and shape the response envelope.
// - `*.schemas.ts` holds Zod request schemas. No Zod beyond the boundary.
// - May import from service/ and shared/. Must NOT import from repository/.
// - Must never import Prisma.
//
// Every router in the application is mounted here and nowhere else
// (architecture-backend.md §12.4).
import { Router } from "express";
import { authRouter } from "./auth/auth.routes.js";
import { dashboardRouter } from "./dashboard/dashboard.routes.js";
import { healthRouter } from "./health/health.routes.js";
import { projectsRouter } from "./projects/projects.routes.js";
import { tasksRouter } from "./tasks/tasks.routes.js";

export const apiRouter: Router = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(tasksRouter);
apiRouter.use(projectsRouter);
apiRouter.use(dashboardRouter);
