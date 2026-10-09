// Service layer — business rules and use cases.
//
// Rules:
// - May import from repository/ and shared/ (config, lib, types).
// - Must NOT import from presentation/.
// - Must NOT touch Prisma, Express, or `res`.
// - Signals failure by throwing AppError; never by returning HTTP status codes.
export * from "./auth.service.js";
export * from "./dashboard.service.js";
export * from "./dueDate.js";
export * from "./github.service.js";
export * from "./health.service.js";
export * from "./password.js";
export * from "./projects.service.js";
export * from "./tasks.mapper.js";
export * from "./tasks.service.js";
export * from "./token.js";
