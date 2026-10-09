// Repository layer — the only place Prisma may be imported.
//
// Rules:
// - One repository per entity: `user.repository.ts`, `task.repository.ts`, ...
// - Every method is a data-access operation. No business rules, no HTTP.
// - Every query is scoped by `userId`; ownership checks live in the service,
//   but the `userId` predicate belongs here.
// - Returns Prisma rows; mapping to a response DTO is the caller's job.
export * from "./health.repository.js";
export * from "./project.repository.js";
export * from "./session.repository.js";
export * from "./task.repository.js";
export * from "./user.repository.js";
