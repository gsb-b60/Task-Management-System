import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { create, getById, list, patch, remove } from "./tasks.controller.js";

export const tasksRouter: Router = Router();

// `requireAuth` is applied per route, never via `router.use`: a router-level
// guard would run for every path that reaches this router and turn unknown
// routes into 401s instead of the app-level 404.
tasksRouter.get("/api/tasks", requireAuth, list);
tasksRouter.post("/api/tasks", requireAuth, create);
tasksRouter.get("/api/tasks/:id", requireAuth, getById);
tasksRouter.patch("/api/tasks/:id", requireAuth, patch);
tasksRouter.delete("/api/tasks/:id", requireAuth, remove);
