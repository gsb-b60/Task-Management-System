# Backend Architecture — Layer Structure

> **Source:** [../srs.md](../srs.md) §14, §15, §16, §17
> **Applies to:** Phase 00 – Phase 04 (and every later backend phase)
> **Authority:** this document defines the backend folder layout and layer boundaries. Where a phase document shows a file tree, this document wins on *where files live*; the phase document wins on *what the code does*.

---

## 1. Objective

Define one backend structure that every phase builds on, so that adding a feature never requires inventing a new folder arrangement.

The backend is a REST API with three layers: **presentation → service → repository**. Each layer has a single job, and dependencies only ever point downward.

---

## 2. Why Three Layers

| Layer | Owns | Reason it exists |
| ----- | ---- | ---------------- |
| **Presentation** | HTTP: paths, status codes, request validation, response shaping | The only layer that knows HTTP exists. Swapping Express, or adding a GraphQL adapter, touches nothing below it. |
| **Service** | Business rules, ownership checks, cross-field validation, orchestration | The reusable core. A rule like "a task belonging to another user is a 404" is testable without a request or a database. |
| **Repository** | Data access: Prisma queries, `userId` scoping, transactions | One place where the database is touched, so swapping Prisma or adding a cache touches nothing above it. |

The common failure this prevents: business rules written inside controllers, where they are only reachable through HTTP and cannot be unit tested.

---

## 3. The Dependency Rule

```text
presentation  ──▶  service  ──▶  repository  ──▶  Prisma
     ▲                            │
     └──────── shared ◀───────────┘
   (config, lib, middleware, types)
```

| Rule | Enforcement |
| ---- | ----------- |
| Presentation may import service and shared | Manual review; grep for `presentation` imports in `service/` |
| Service may import repository and shared | Same |
| **Service must never import presentation** | Keeps the core reusable and HTTP-free |
| **Presentation must never import repository or Prisma** | `grep -r "from \"\.\./\.\./repository" src/presentation` must return nothing |
| **Repository must never import service or presentation** | Prevents circular dependencies |
| A layer never imports upward across features | Enforced by convention and code review |

Prisma is imported in exactly two kinds of file: `src/repository/*` and `src/lib/prisma.ts`. Anywhere else is a layering violation.

---

## 4. Directory Layout

```text
backend/
├── prisma/                          # Phase 00 — schema, migrations, seed
├── src/
│   ├── app.ts                       # Express app assembly (no listen)
│   ├── server.ts                    # Boot, listen, graceful shutdown
│   ├── config/
│   │   └── env.ts                   # Zod-validated process.env, fails fast at boot
│   ├── lib/                         # Cross-cutting infrastructure, no business logic
│   │   ├── prisma.ts                # PrismaClient singleton
│   │   ├── errors.ts                # AppError, error codes, envelope shape
│   │   └── dates.ts                 # Date-only parsing (SRS: local, never UTC)
│   ├── middleware/                  # Express middleware only
│   │   ├── errorHandler.ts          # AppError/ZodError → error envelope
│   │   ├── notFound.ts              # Unmatched route → 404 envelope
│   │   ├── requireAuth.ts           # Phase 01
│   │   ├── requireOwnership.ts      # Phase 01
│   │   └── rateLimit.ts             # Phase 01
│   ├── presentation/                # ── HTTP boundary ──
│   │   ├── index.ts                 # Barrel: mounts all feature routers
│   │   └── <feature>/
│   │       ├── <feature>.routes.ts
│   │       ├── <feature>.controller.ts
│   │       ├── <feature>.schemas.ts   # Zod request schemas
│   │       └── __tests__/
│   ├── service/                     # ── business rules ──
│   │   ├── index.ts                 # Barrel + layer contract
│   │   ├── <feature>.service.ts
│   │   ├── <feature>.mapper.ts      # Prisma row → response DTO
│   │   └── __tests__/
│   └── repository/                  # ── data access ──
│       ├── index.ts                 # Barrel + layer contract
│       ├── <entity>.repository.ts
│       └── __tests__/
├── .env.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

A layer folder is created in git with an `index.ts` barrel that states its contract, so an empty layer still documents itself.

### 4.1 Naming Conventions

| Suffix | Layer | Contains |
| ------ | ----- | -------- |
| `.routes.ts` | presentation | Path strings, middleware chains, nothing else |
| `.controller.ts` | presentation | Parse/validate, call one service method, set status, shape response |
| `.schemas.ts` | presentation | Zod schemas for body, query, params |
| `.service.ts` | service | Use cases and business rules |
| `.mapper.ts` | service | Prisma row → response DTO |
| `.repository.ts` | repository | Prisma queries, `userId` scoping |
| `.types.ts` | any | Interfaces and type aliases only, no runtime code |

Feature folders in presentation are plural or singular by convention of the feature (`tasks/`, `auth/`, `dashboard/`). Repository files are singular entities (`task.repository.ts`).

---

## 5. Request Lifecycle

A request crosses each layer exactly once, in order.

```text
1. request
     │
2. ▼ middleware/requireAuth        verify session, attach req.user        [Phase 01]
     │
3. ▼ presentation/<feature>.routes.ts       declare path + middleware
     │
4. ▼ presentation/<feature>.schemas.ts      Zod-parse body/query → 400 on failure
     │
5. ▼ presentation/<feature>.controller.ts   pick status code, no logic of its own
     │
6. ▼ service/<feature>.service.ts           ownership check, business rules
     │        throws AppError → jumps to middleware/errorHandler
     │
7. ▼ repository/<entity>.repository.ts      Prisma query, scoped by userId
     │
8. ▼ service/<feature>.mapper.ts            row → DTO, strips userId
     │
9. ▼ response  200 / 201 / 204 + JSON envelope
```

Layer responsibilities in one line each:

| Step | Layer | Rule |
| ---- | ----- | ---- |
| 2 | middleware | Auth only. Never business rules. |
| 3 | routes | No logic. Not even a default value. |
| 4 | schemas | Parse and reject. Types flow inward from here. |
| 5 | controller | Orchestration only — one service call. |
| 6 | service | All business rules. No HTTP, no Prisma. |
| 7 | repository | All data access. Every query scoped by `userId`. |
| 8 | mapper | Shapes the response body. Never leaks internal columns. |

---

## 6. Shared and Cross-Cutting Code

| Location | Holds | Does not hold |
| -------- | ----- | ------------- |
| `config/` | Validated environment | Anything feature-specific |
| `lib/` | Prisma client, error types, date helpers | Business rules, HTTP |
| `middleware/` | Express middleware | Business rules, Prisma queries |

When two features need the same helper, it goes in `lib/` — not in one feature's folder — so neither feature owns it.

---

## 7. Worked Example — the `tasks` Feature

How a Phase 02 feature maps onto the three layers.

```text
src/
├── presentation/tasks/
│   ├── tasks.routes.ts          GET/POST /api/tasks, PATCH/DELETE /api/tasks/:id
│   ├── tasks.controller.ts      status codes, envelope, calls the service
│   ├── tasks.schemas.ts         createBody, updateBody, listQuery (Zod)
│   └── __tests__/tasks.integration.test.ts
├── service/
│   ├── tasks.service.ts         create, list, getById, update, remove
│   ├── tasks.mapper.ts          toTaskDto(row) — excludes userId
│   └── __tests__/tasks.service.test.ts
└── repository/
    └── task.repository.ts       findByIdAndUser, findManyForUser, create, …
```

### 7.1 What Each File Actually Contains

**`task.repository.ts`** — data access, ownership predicate included:

```ts
// Correct: the userId predicate lives here.
async findByIdForUser(id: string, userId: string) {
  return prisma.task.findFirst({ where: { id, userId } });
}

// Wrong: leaks existence of another user's task (Phase 02 §4.4).
async findById(id: string) {
  return prisma.task.findUnique({ where: { id } });
}
```

**`tasks.service.ts`** — rules, no HTTP:

```ts
async getById(id: string, userId: string): Promise<TaskDto> {
  const task = await taskRepository.findByIdForUser(id, userId);
  if (task === null) {
    throw new AppError("NOT_FOUND", "Task not found.");
  }
  return toTaskDto(task);
}
```

**`tasks.controller.ts`** — HTTP only:

```ts
async function getById(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const task = await tasksService.getById(id, req.user.id);
  res.status(200).json({ data: task });
}
```

**`tasks.mapper.ts`** — the leak boundary:

```ts
// userId is deliberately absent. No response body ever carries it.
export function toTaskDto(row: Task): TaskDto {
  return { id: row.id, title: row.title, status: row.status, /* … */ };
}
```

---

## 8. Adding a Feature

Checklist, in order. Each step compiles before the next begins.

```text
 1. Schema            prisma/schema.prisma, then migrate        [Phase 00+]
 2. Repository        src/repository/<entity>.repository.ts
 3. Service           src/service/<feature>.service.ts
 4. Mapper            src/service/<feature>.mapper.ts         (if it returns rows)
 5. Schemas           src/presentation/<feature>/<feature>.schemas.ts
 6. Controller        src/presentation/<feature>/<feature>.controller.ts
 7. Routes            src/presentation/<feature>/<feature>.routes.ts
 8. Mount             src/presentation/index.ts
 9. Tests             unit in service/, integration in presentation/
```

Steps 2–4 are complete before any HTTP exists, which is what makes the business rules unit-testable.

---

## 9. Rules and Anti-Patterns

| Anti-pattern | Why it is wrong | Instead |
| ------------ | --------------- | ------- |
| `prisma.task.findFirst()` in a controller | Bypasses the repository; rules and data access fuse | Call a service method |
| `res.status(404)` in a service | Service now knows HTTP and cannot be reused | `throw new AppError("NOT_FOUND", …)` |
| Controller decides whether a user owns a task | Ownership is a business rule and belongs in service | Service checks `userId`, returns 404 |
| `findUnique({ where: { id } })` for a user-owned row | Confirms the row exists to another user (SRS §4.4) | `findFirst({ where: { id, userId } })` |
| Returning a Prisma row straight from a controller | Leaks columns such as `passwordHash`, `userId` | Mapper returns a DTO |
| Accepting `userId` in a request body | Client-controlled ownership | Ignore or reject the field |
| Business logic in `lib/` | `lib` is infrastructure; feature logic has no owner | Put it in the feature's service |
| One giant `services/` folder | Naming drifts, files become unrelated | One file per feature |

---

## 10. Testing Layout

| Layer | Test type | Location | Asserts |
| ----- | --------- | -------- | ------- |
| Presentation | integration | `src/presentation/<feature>/__tests__/*.integration.test.ts` | Route, status, envelope, over HTTP via Supertest |
| Service | unit | `src/service/__tests__/*.service.test.ts` | Business rules, with the repository mocked |
| Repository | integration | `src/repository/__tests__/*.repository.test.ts` | Queries, `userId` scoping, against a real test database |

Service tests are the ones that pay off: they run with no database and no HTTP, so they are fast and pin down the rules. Coverage targets are in Phase 10.

---

## 11. Phase → File Map

| Phase | presentation | service | repository | lib / middleware |
| ----- | ------------ | ------- | ---------- | ---------------- |
| 00 | `index.ts`, `health/` | `health.service.ts` | — | `env.ts`, `prisma.ts`, `errors.ts`, `errorHandler`, `notFound` |
| 01 | `auth/auth.*` | `auth.service.ts`, `github.service.ts`, `password.ts`, `token.ts` | `user.repository.ts`, `session.repository.ts` | `requireAuth`, `requireOwnership`, `rateLimit` |
| 02 | `tasks/tasks.*` | `tasks.service.ts`, `tasks.mapper.ts` | `task.repository.ts`, `project.repository.ts` | `dates.ts` |
| 03 | `tasks/tasks.schemas.ts` (list query) | `tasks.service.ts` (search/filter/paginate) | `task.repository.ts` (+ `pg_trgm` index) | — |
| 04 | `dashboard/dashboard.*` | `dashboard.service.ts` | `task.repository.ts` (aggregates) | — |

---

## 12. Acceptance Criteria

1. Every backend file lives in one of the seven directories under `src/`, or in `prisma/`.
2. `grep -r "repository" src/presentation` and `grep -r "prisma" src/service` return nothing.
3. No file in `src/service/` imports from `src/presentation/`.
4. Every route is reachable through `src/presentation/index.ts`; no router is mounted anywhere else.
5. The API starts and both health endpoints respond — `pnpm dev` on port **5004**.
6. `pnpm typecheck` and `pnpm build` pass with `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` enabled.

---

## 13. Conventions Applied Here

- ESM throughout (`"type": "module"`), so relative imports carry a `.js` extension.
- `verbatimModuleSyntax` is on: type-only imports use `import type`.
- `src/app.ts` builds the app and returns it; `src/server.ts` listens. This split is what lets integration tests drive the app with Supertest without binding a port.
- Errors always leave through `middleware/errorHandler.ts` in the Phase 00 §8 envelope.

---

## 14. References

- [Phase 00 — Backend Foundation](phase-00-backend-foundation.md) — error envelope, env vars, health endpoints
- [Phase 01](phase-01-backend-auth.md) · [Phase 02](phase-02-backend-task-crud.md) · [Phase 03](phase-03-backend-search-filter-pagination.md) · [Phase 04](phase-04-backend-dashboard.md)
- [API & Data Format](api-data-format.md)
- SRS §14 Functional Requirements · §15 Non-Functional · §16 Technology Stack · §17 Database Design