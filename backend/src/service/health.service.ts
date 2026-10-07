export interface HealthStatus {
  status: "ok";
  uptimeSeconds: number;
}

export function getHealth(): HealthStatus {
  return {
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  };
}