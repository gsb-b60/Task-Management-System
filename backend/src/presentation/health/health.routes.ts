import { Router } from "express";
import { healthController } from "./health.controller.js";

export const healthRouter: Router = Router();

// Liveness probe — no auth, no database.
healthRouter.get("/health", healthController);

// Readiness probe. Phase 00 adds the database check:
//   `database: "connected" | "disconnected"`, 503 when unreachable.
healthRouter.get("/api/health", healthController);