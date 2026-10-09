import type { Request, Response } from "express";
import { getHealth, getReadiness } from "../../service/index.js";
import type { HealthStatus, ReadinessStatus } from "../../service/index.js";

/** Liveness — process is up, no database involved. */
export function healthController(_req: Request, res: Response<HealthStatus>): void {
  res.status(200).json(getHealth());
}

/**
 * Readiness — includes database connectivity. A 503 here is a valid health
 * response, not an error envelope: the probe reports a condition rather than
 * failing a request (api-data-format §6.1).
 */
export async function readinessController(
  _req: Request,
  res: Response<ReadinessStatus>,
): Promise<void> {
  const status = await getReadiness();
  res.status(status.status === "ok" ? 200 : 503).json(status);
}
