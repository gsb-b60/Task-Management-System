import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { currentUser } from "../../middleware/requireAuth.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "../../service/index.js";
import type { CreateTaskBody, TaskListQuery, UpdateTaskBody } from "./tasks.schemas.js";
import { createTaskBody, taskListQuery, updateTaskBody } from "./tasks.schemas.js";

function idParam(req: Request): string {
  const id: unknown = req.params["id"];
  if (typeof id !== "string" || id === "") {
    throw new AppError("NOT_FOUND", "Task not found.");
  }
  return id;
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = taskListQuery.parse(req.query) satisfies TaskListQuery;
  const page = await listTasks(currentUser(req).id, query);
  res.status(200).json(page);
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = createTaskBody.parse(req.body) satisfies CreateTaskBody;
  const task = await createTask(currentUser(req).id, body);
  res.status(201).json({ data: task });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const task = await getTaskById(currentUser(req).id, idParam(req));
  res.status(200).json({ data: task });
}

export async function patch(req: Request, res: Response): Promise<void> {
  const body = updateTaskBody.parse(req.body) satisfies UpdateTaskBody;
  const task = await updateTask(currentUser(req).id, idParam(req), body);
  res.status(200).json({ data: task });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await deleteTask(currentUser(req).id, idParam(req));
  res.status(204).end();
}
