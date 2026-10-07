// Placeholder for the Prisma client singleton (Phase 00).
//
// The client is imported ONLY by the repository layer and by this file's
// consumers in infrastructure. Presentation and service layers must never
// import Prisma directly — see docs/architecture-backend.md §3.
export const PRISMA_NOT_CONFIGURED =
  "Prisma is not configured yet. See docs/phase-00-backend-foundation.md.";