// Service layer — business rules and use cases.
//
// Rules:
// - May import from repository/ and shared/ (config, lib, types).
// - Must NOT import from presentation/.
// - Must NOT touch Prisma, Express, or `res`.
// - Signals failure by throwing AppError; never by returning HTTP status codes.
export { getHealth } from "./health.service.js";
export type { HealthStatus } from "./health.service.js";