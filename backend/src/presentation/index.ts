// Presentation layer — the HTTP boundary.
//
// Rules:
// - `*.routes.ts` declare paths and middleware, nothing else.
// - `*.controller.ts` parse/validate input, call exactly one service method,
//   choose the status code, and shape the response envelope.
// - `*.schemas.ts` holds Zod request schemas. No Zod beyond the boundary.
// - May import from service/ and shared/. Must NOT import from repository/.
// - Must never import Prisma.
import { Router } from "express";
import { healthRouter } from "./health/health.routes.js";

export const apiRouter: Router = Router();

apiRouter.use(healthRouter);