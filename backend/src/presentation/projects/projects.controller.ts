import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { currentUser } from "../../middleware/requireAuth.js";
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  updateProject,
} from "../../service/index.js";
import type { CreateProjectBody, UpdateProjectBody } from "./projects.schemas.js";
import { createProjectBody, updateProjectBody } from "./projects.schemas.js";

function idParam(req: Request): string {
  const id: unknown = req.params["id"];
  if (typeof id !== "string" || id === "") {
    throw new AppError("NOT_FOUND", "Project not found.");
  }
  return id;
}

export async function list(req: Request, res: Response): Promise<void> {
  const projects = await listProjects(currentUser(req).id);
  res.status(200).json({ data: projects });
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = createProjectBody.parse(req.body) satisfies CreateProjectBody;
  const project = await createProject(currentUser(req).id, body);
  res.status(201).json({ data: project });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const project = await getProjectById(currentUser(req).id, idParam(req));
  res.status(200).json({ data: project });
}

export async function patch(req: Request, res: Response): Promise<void> {
  const body = updateProjectBody.parse(req.body) satisfies UpdateProjectBody;
  const project = await updateProject(currentUser(req).id, idParam(req), body);
  res.status(200).json({ data: project });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await deleteProject(currentUser(req).id, idParam(req));
  res.status(204).end();
}
