import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  importProjectIssues,
  linkRepository,
  listIssues,
  listRepositories,
  unlinkRepository,
} from "./github.controller.js";

export const githubRouter: Router = Router();

// Per-route guards only — see the note in tasks.routes.ts.
githubRouter.get("/api/github/repositories", requireAuth, listRepositories);
githubRouter.get("/api/github/repositories/:githubId/issues", requireAuth, listIssues);
githubRouter.post("/api/projects/:id/github-repository", requireAuth, linkRepository);
githubRouter.delete("/api/projects/:id/github-repository", requireAuth, unlinkRepository);
githubRouter.post("/api/projects/:id/import-issues", requireAuth, importProjectIssues);
