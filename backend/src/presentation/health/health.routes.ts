import { Router } from "express";
import { healthController, readinessController } from "./health.controller.js";

export const healthRouter: Router = Router();

// Liveness probe — no auth, no database.
healthRouter.get("/health", healthController);

// Readiness probe — 200 with `database: "connected"`, 503 when unreachable.
healthRouter.get("/api/health", readinessController);
