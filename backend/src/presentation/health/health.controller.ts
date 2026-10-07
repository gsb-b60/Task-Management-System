import type { Request, Response } from "express";
import { getHealth } from "../../service/index.js";
import type { HealthStatus } from "../../service/index.js";

export function healthController(_req: Request, res: Response<HealthStatus>): void {
  res.status(200).json(getHealth());
}