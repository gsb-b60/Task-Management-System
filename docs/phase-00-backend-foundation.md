# Phase 00 — Backend Foundation

> **Source:** [../srs.md](../srs.md) §13, §15, §16, §17
> **Priority:** Mandatory (Must)
> **Blocks:** Every subsequent phase

---

## 1. Objective

Stand up the backend runtime, database layer, configuration loading, and project scaffolding. No feature behaviour in this phase — this phase produces a running API that returns a health check and can talk to PostgreSQL.

---

## 2. Scope

### 2.1 In Scope

- Node.js + TypeScript backend workspace (`backend/`)
- REST API server with a health endpoint
- PostgreSQL connection via Prisma
- Versioned database migrations
- Seed script with sample data
- `.env.example` with no real secrets
- Environment variable validation at boot
- Structured error envelope for all responses
- CORS configuration for the frontend dev server

### 2.2 Out of Scope

- Authentication (Phase 01)
- Task endpoints (Phase 02)
- Search / filter / pagination (Phase 03)
- Dashboard aggregates (Phase 04)
- Docker Compose (Phase 11)
- CI pipeline (Phase 10)

---

## 3. Requirements Traceability

| Requirement | SRS Source | Covered Here |
| ----------- | ---------- | ------------ |
| REST API | §13 Backend, §16 Backend | Yes |
| PostgreSQL database | §13 Database, §17 | Yes |
| Prisma ORM | §13 Database, §16 Database | Yes |
| Migrations with FK + constraints | §17.3, §17.4 | Yes |
| Seed / sample data | §17.4 | Yes |
| Parameterised queries (no injection) | §15 Security | Yes |
| Database indexes on filter/sort fields | §15 Scalability | Yes — schema defined, indexing added in Phase 03 |
| `.env.example`, no real secrets | §18 DL-03 | Yes |
| Failed DB operations return errors | §15 Reliability | Yes |

---

## 4. Technical Decisions

| Concern              | Choice                        | Rationale                          |
| -------------------- | ----------------------------- | ---------------------------------- |
| Runtime              | Node.js 20 LTS                | Matches brief suggestion           |
| Language             | TypeScript (strict)           | Type safety on the API surface     |
| Package manager      | pnpm (already pinned)         | Repo standard, `devEngines` set    |
| HTTP framework       | Express 5                     | Brief-friendly, minimal ceremony    |
| ORM                  | Prisma                        | SRS mandates it                    |
| Database             | PostgreSQL 16                 | SRS mandates it                    |
| Validation           | Zod                           | Schema at the HTTP boundary        |
| Migrations           | `prisma migrate`              | Versioned, reversible where possible |
| Module system        | ESM (`"type": "module"`)      | Already declared in `package.json` |

---

## 5. Proposed Layout

Layer structure is defined in [architecture-backend.md](architecture-backend.md) — that document is authoritative on *where files live*. Phase 00 fills in the infrastructure folders and the first vertical slice.

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app.ts                 # express app assembly
│   ├── server.ts              # boot, listen, graceful shutdown
│   ├── config/
│   │   └── env.ts             # Zod-validated process.env
│   ├── lib/
│   │   ├── prisma.ts          # PrismaClient singleton
│   │   └── errors.ts          # AppError, error codes
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── notFound.ts
│   │   ├── requireAuth.ts     # stubbed in Phase 01
│   │   ├── requireOwnership.ts# Phase 01
│   │   └── rateLimit.ts       # Phase 01
│   ├── presentation/          # HTTP boundary
│   │   ├── index.ts           # mounts all feature routers
│   │   ├── health/            # Phase 00
│   │   ├── auth/              # Phase 01
│   │   ├── tasks/             # Phase 02
│   │   └── dashboard/         # Phase 04
│   ├── service/               # business rules
│   │   ├── index.ts
│   │   ├── health.service.ts  # Phase 00
│   │   ├── auth.service.ts    # Phase 01
│   │   ├── tasks.service.ts   # Phase 02
│   │   └── dashboard.service.ts # Phase 04
│   └── repository/            # data access — Prisma lives only here
│       ├── index.ts
│       ├── user.repository.ts   # Phase 01
│       ├── session.repository.ts# Phase 01
│       ├── task.repository.ts   # Phase 02
│       └── project.repository.ts# Phase 08
├── .env.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## 6. Data Model (full schema — later phases build on this)

All entities are created in this phase so migrations stay additive and reviewable.

```text
User
├── Project
│   ├── GitHubRepository (optional)
│   └── Task
└── Session
```

### 6.1 `User`

| Column       | Type          | Notes                          |
| ------------ | ------------- | ------------------------------ |
| `id`         | UUID          | PK, default `uuid()`           |
| `email`      | String        | Unique, citext, indexed        |
| `passwordHash` | String      | Null only for OAuth-only users |
| `displayName` | String       | Nullable                       |
| `githubId`   | String        | Unique, nullable (Phase 06)    |
| `githubLogin`| String        | Nullable (Phase 06)            |
| `githubAccessToken` | String  | Nullable, server-side only (Phase 06) |
| `createdAt`  | DateTime      | `@default(now())`              |
| `updatedAt`  | DateTime      | `@updatedAt`                   |

### 6.2 `Session`

Backs the Phase 01 session strategy.

| Column      | Type     | Notes                        |
| ----------- | -------- | ---------------------------- |
| `id`        | UUID     | PK                           |
| `token`     | String   | Unique, indexed (lookup key)  |
| `userId`    | UUID     | FK → `User.id`, `CASCADE`    |
| `expiresAt` | DateTime | Indexed for cleanup          |
| `createdAt` | DateTime | `@default(now())`            |

### 6.3 `Project`

| Column        | Type     | Notes                        |
| ------------- | -------- | ---------------------------- |
| `id`          | UUID     | PK                           |
| `name`        | String   | Required                     |
| `description` | String   | Nullable                     |
| `startDate`   | DateTime | Nullable                     |
| `targetDate`  | DateTime | Nullable                     |
| `userId`      | UUID     | FK → `User.id`, `CASCADE`    |
| `createdAt`   | DateTime | `@default(now())`            |
| `updatedAt`   | DateTime | `@updatedAt`                 |

### 6.4 `Task`

Defined fully in SRS §5.1.

| Column       | Type     | Notes                                    |
| ------------ | -------- | ---------------------------------------- |
| `id`         | UUID     | PK                                       |
| `title`      | String   | Required, max 200 chars                  |
| `description` | String  | Nullable                                 |
| `status`     | Enum     | `TODO` \| `IN_PROGRESS` \| `DONE`        |
| `priority`   | Enum     | `LOW` \| `MEDIUM` \| `HIGH`              |
| `startDate`  | DateTime | Nullable                                 |
| `dueDate`    | DateTime | Nullable                                 |
| `userId`     | UUID     | FK → `User.id`, `CASCADE`                |
| `projectId`  | UUID     | Nullable, FK → `Project.id`, `CASCADE`   |
| `createdAt`  | DateTime | `@default(now())`                        |
| `updatedAt`  | DateTime | `@updatedAt`                             |

### 6.5 `GitHubRepository`

Populated in Phase 06; table created now to avoid a later breaking migration.

| Column        | Type   | Notes                                 |
| ------------- | ------ | ------------------------------------- |
| `id`          | UUID   | PK                                    |
| `githubId`    | BigInt | Unique — GitHub's repository ID       |
| `name`        | String | Required                              |
| `fullName`    | String | `owner/repo`                          |
| `owner`       | String | Required                              |
| `description` | String | Nullable                              |
| `visibility`  | String | `public` \| `private`                 |
| `defaultBranch` | String | Nullable                            |
| `url`         | String | Nullable                              |
| `projectId`   | UUID   | Unique, FK → `Project.id`, `CASCADE`  |

### 6.6 Constraints

Per SRS §17.3:

- FKs with `onDelete: CASCADE` from every child to `User`
- `NOT NULL` on `Task.title`, `Task.status`, `Task.priority`, `Task.userId`
- Enums act as check constraints for `status` and `priority`
- Check constraint: `dueDate >= startDate` when both are non-null
- Unique: `User.email`, `Session.token`, `GitHubRepository.githubId`

---

## 7. API Surface

| Method | Path      | Auth | Description                 |
| ------ | --------- | ---- | --------------------------- |
| GET    | `/health` | No   | Liveness probe              |
| GET    | `/api/health` | No | Readiness: DB connectivity  |

### 7.1 `GET /api/health`

**200 OK**

```json
{
  "status": "ok",
  "database": "connected",
  "uptimeSeconds": 42
}
```

**503 Service Unavailable** — database unreachable.

---

## 8. Error Envelope

Every error response in every phase uses this shape.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request failed validation.",
    "details": [
      { "field": "email", "message": "Must be a valid email address." }
    ]
  }
}
```

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `VALIDATION_ERROR` | 400 | Request body/query failed schema validation |
| `UNAUTHENTICATED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Authenticated but not the owner |
| `NOT_FOUND` | 404 | Resource does not exist or is not visible to the user |
| `CONFLICT` | 409 | Unique constraint violated (e.g. duplicate email) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled failure — details never leaked |

---

## 9. Environment Variables

`.env.example` — placeholders only, no real secrets.

```dotenv
NODE_ENV=development
PORT=5004
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todogit?schema=public"

# Phase 01 — auth
JWT_SECRET="change-me"
JWT_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=12

# Phase 06 — GitHub
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:5004/api/auth/github/callback"

# Phase 09 — deployment
FRONTEND_ORIGIN="http://localhost:5173"
```

`src/config/env.ts` validates all present variables at boot with Zod and exits with a readable message on failure.

---

## 10. Tasks

- [ ] Add `express`, `prisma`, `@prisma/client`, `zod`, `cors` to `backend/package.json`
- [ ] Add `tsx` (present) as the dev runner; add `build` and `start` scripts
- [ ] Enable `strict` in `backend/tsconfig.json`
- [ ] Create `prisma/schema.prisma` with all six models, enums, FKs, indexes, check constraint
- [ ] Run `prisma migrate dev --name init`
- [ ] Create `prisma/seed.ts` with one demo user, two projects, ~12 tasks across all statuses/priorities, and at least one overdue task so Phase 04 has visible output
- [ ] Create `src/config/env.ts` with Zod validation
- [ ] Create `src/lib/prisma.ts` client singleton
- [ ] Create `src/lib/errors.ts` with `AppError` + error code table
- [ ] Create `src/middleware/errorHandler.ts` mapping `AppError` → error envelope
- [ ] Create `src/middleware/notFound.ts`
- [ ] Create `src/app.ts` (JSON body parsing, CORS, routes, error handler last)
- [ ] Create `src/server.ts` with graceful shutdown
- [ ] Implement `GET /health` and `GET /api/health` as `src/presentation/health/` + `src/service/health.service.ts`
- [ ] Create `.env.example` and confirm `.env` is gitignored
- [ ] Verify `GET /api/health` returns 200 against a running PostgreSQL

---

## 11. Acceptance Criteria

1. `pnpm --filter backend dev` starts the API without error.
2. `GET /api/health` returns `200` with `"database": "connected"` when PostgreSQL is reachable, and `503` when it is not.
3. `npx prisma migrate dev` applies cleanly to an empty database.
4. `npx prisma db seed` inserts the demo user and sample tasks; every task status and priority enum value appears at least once.
5. `npx prisma migrate reset` restores a clean, seeded database — proving migrations are complete and repeatable.
6. `pnpm --filter backend build` compiles with `strict` and zero errors.
7. Any thrown `AppError` returns the §8 envelope with the correct HTTP status; an unhandled error returns `500` with no stack trace in the body.
8. `.env.example` contains no real credentials.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Prisma migrate drifts from `schema.prisma` | Phase 00 acceptance criteria 3–5 gate every later phase |
| Check constraint syntax differs across Postgres versions | Verify against Postgres 16 in a container before building on it |
| `BigInt` for `githubId` serialises badly over JSON | Introduce a `bigint` → string serializer in Phase 06, not now |

---

## 13. References

- SRS §13 Technology Stack
- SRS §15 Non-Functional Requirements
- SRS §16 Technology Stack
- SRS §17 Database Design