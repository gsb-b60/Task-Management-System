import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { summary, upcoming } from "./dashboard.controller.js";

export const dashboardRouter: Router = Router();

// Per-route guards only — see the note in tasks.routes.ts.
dashboardRouter.get("/api/dashboard/summary", requireAuth, summary);
dashboardRouter.get("/api/dashboard/upcoming", requireAuth, upcoming);
