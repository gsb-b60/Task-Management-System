// Liveness and readiness probes (Phase 00 §7).
//
// `/health` never touches the database; `/api/health` reports connectivity and
// answers 503 when it is missing. Both return a bare object — a health probe
// should be readable by `curl` without unwrapping an envelope (api-data-format
// §4.1).
import { pingDatabase } from "../repository/health.repository.js";

export interface HealthStatus {
  status: "ok";
  uptimeSeconds: number;
}

export interface ReadinessStatus {
  status: "ok" | "unavailable";
  database: "connected" | "unavailable";
  uptimeSeconds: number;
}

export function getHealth(): HealthStatus {
  return {
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

export async function getReadiness(): Promise<ReadinessStatus> {
  const connected = await pingDatabase();
  return {
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "unavailable",
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
