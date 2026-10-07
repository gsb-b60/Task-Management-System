// Repository layer — the only place Prisma may be imported.
//
// Rules:
// - One repository per entity: `user.repository.ts`, `task.repository.ts`, ...
// - Every method is a data-access operation. No business rules, no HTTP.
// - Every query is scoped by `userId`; ownership checks live in the service,
//   but the `userId` predicate belongs here.
// - Returns Prisma rows; mapping to a response DTO is the caller's job.
//
// Repositories added by later phases:
// - Phase 00 — user, session (auth module)
// - Phase 02 — task, project
// - Phase 04 — task (dashboard aggregates)
export {};