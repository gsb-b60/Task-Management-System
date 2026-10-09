import type { Request, Response } from "express";
import { currentUser } from "../../middleware/requireAuth.js";
import { getSummary, getUpcoming } from "../../service/index.js";
import { dashboardQuery, upcomingQuery } from "./dashboard.schemas.js";

export async function summary(req: Request, res: Response): Promise<void> {
  const { projectId } = dashboardQuery.parse(req.query);
  const stats = await getSummary(currentUser(req).id, projectId);
  res.status(200).json({ data: stats });
}

export async function upcoming(req: Request, res: Response): Promise<void> {
  const query = upcomingQuery.parse(req.query);
  const page = await getUpcoming(currentUser(req).id, query);
  res.status(200).json(page);
}
