import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { create, createFromGitHub, getById, list, patch, remove } from "./projects.controller.js";

export const projectsRouter: Router = Router();

// Per-route guards only — see the note in tasks.routes.ts.
projectsRouter.get("/api/projects", requireAuth, list);
projectsRouter.post("/api/projects", requireAuth, create);
projectsRouter.post("/api/projects/from-github", requireAuth, createFromGitHub);
projectsRouter.get("/api/projects/:id", requireAuth, getById);
projectsRouter.patch("/api/projects/:id", requireAuth, patch);
projectsRouter.delete("/api/projects/:id", requireAuth, remove);
