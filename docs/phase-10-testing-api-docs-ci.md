# Phase 10 — Frontend: Testing, API Docs & CI

> **Source:** [../srs.md](../srs.md) §15 Testability, §16 Testing / API Documentation / CI, §18
> **Priority:** Bonus · FR-29, FR-30 · DL-04, DL-05
> **Blocks:** Phase 12 (Deployment, PR submission)

---

## 1. Objective

Wire the test suites, generate API documentation, and stand up the CI pipeline. Every earlier phase listed the tests it expects; this phase makes them actually run, and is the gate for the deployment and submission phases.

---

## 2. Scope

### 2.1 In Scope

- Vitest configured for the backend, including an integration-test environment
- Vitest + Testing Library for the frontend
- Coverage reporting with a threshold
- Swagger / OpenAPI generation and serving
- GitHub Actions workflow: install → lint → migrate → test → build
- Test documentation in the README

### 2.2 Out of Scope

- Visual regression testing
- Load testing
- End-to-end browser tests (Playwright) — recommended, not committed
- Mutation testing
- Nightly or scheduled runs beyond the push trigger

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-29 | API documented with Swagger / OpenAPI | §16 API Documentation |
| FR-30 | CI pipeline runs tests on push | §16 Continuous Integration |
| — | Core logic covered by unit tests | §15 Testability |
| — | Critical API flows covered by integration tests | §15 Testability |
| — | Tests runnable via a single documented command | §15 Testability |
| — | Migrations and seed in the repository | §17.4, DL-04 |
| — | API documentation delivered | DL-05 |

---

## 4. Testing Strategy

### 4.1 Three Layers

| Layer | Scope | Location | Speed |
| ----- | ----- | -------- | ----- |
| Unit | Pure logic — date arithmetic, `daysUntilDue`, roadmap layout, password helpers, mappers | co-located `__tests__` | < 50 ms |
| Integration | HTTP routes against a real test database | `*.integration.test.ts` | seconds |
| Component | React components and hooks with a mocked API layer | `frontend/src/**/*.test.tsx` | < 500 ms |

Integration tests exercise the real Prisma client, real validation schemas, and real middleware — mocking Prisma would test the mock, not the code.

### 4.2 Test Database

Each run gets an isolated database, created and destroyed by the setup script:

```text
CREATE DATABASE todogit_test
  → run all migrations
  → seed fixtures
  → run tests
  → drop the database
```

Options, chosen together:

| Approach | Decision |
| -------- | -------- |
| Shared database, transactional rollback per test | Fast, but a test that commits breaks the isolation of every test after it |
| **Fresh schema per test run** | **Chosen** — isolation guaranteed, cost is seconds |
| Testcontainers | Heavier, and Docker may be unavailable in CI |

Tests run sequentially against the shared schema. Parallel workers would each need their own database.

### 4.3 Commands

```text
Backend
  test          unit + integration
  test:unit     unit only
  test:coverage unit + integration with coverage
  test:watch    watch mode

Frontend
  test          component tests
  test:coverage component tests with coverage
```

One documented command runs everything: `pnpm test` from the repo root, via a pnpm workspace script.

---

## 5. Test Inventory

### 5.1 Backend Unit

| Target | Key cases |
| ------ | --------- |
| `password.ts` | hash ≠ plaintext; verify succeeds on the correct password; fails on the wrong one; miss path is comparable in timing |
| `token.ts` | generation is random, URL-safe, and hashed before storage |
| `dueDate.ts` | `isOverdue`; `daysUntilDue` for `0`, `+1`, `-1`; calendar-day not 24-hour semantics |
| `pagination.ts` | defaults; clamping `pageSize` to 100; `skip` / `take`; `meta` maths |
| `tasks.mapper.ts` | response shape; `userId` never present |
| `github.service.ts` | the three linking cases |
| `roadmapScale.ts` | `left`, `width`, clamping, `minWidth` |

### 5.2 Backend Integration

Every case listed in Phases 01 – 08, aggregated:

| Module | Coverage |
| ------ | -------- |
| Auth | register, duplicate, bad input, login, wrong password, unknown email, logout, session expiry, rate limit, all three GitHub callback paths |
| Tasks | create defaults, validation, cross-field dates, read/update/delete, isolation across users, `userId` never in a response |
| Search / filter / pagination | title search, case-insensitivity, status and priority filters, composition, page disjointness, union completeness, sort determinism, null ordering |
| Dashboard | `groupBy` totals, missing status → `0`, isolation, upcoming selection rules, overdue flagging, calendar-day semantics |
| Projects | CRUD, `targetDate` rule, cascade delete, isolation |
| Health | 200 with a live database, 503 without |

### 5.3 Frontend Component

| Target | Key cases |
| ------ | --------- |
| `AuthContext` | status transitions; 401 clears the session |
| `ProtectedRoute` | redirect; splash during the session check |
| `RegisterPage` / `LoginPage` | field-level errors; generic credential error; disabled while in flight |
| `DashboardPage` | four counts; `isOverdue` rendered verbatim; `daysUntilDue: 0` → "due today" |
| `TasksPage` | debounce; filter composition; page reset; URL as source of truth; empty vs. filtered-empty |
| `TaskForm` | due-before-start blocked; server `details[]` mapped |
| `BoardPage` | optimistic move; **rollback to the exact prior column on failure**; keyboard status control |
| `ProjectSwitcher` | writes `projectId`; restores after refresh |
| `RoadmapPage` | date-only timezone regression; Undated lane; bar geometry |

### 5.4 Prioritised Cases

If time is short, these carry the most value and must not be skipped:

1. **Board rollback on failure** — the explicit SRS §9.3 requirement
2. **Task ownership isolation** — every route, every phase
3. **Pagination union completeness** — duplicated or lost rows are the classic silent bug
4. **Login timing / error parity** — the security guarantee in Phase 01
5. **Date-only timezone rendering** — a visible off-by-one in the Roadmap
6. **Dashboard overdue calendar-day semantics**

---

## 6. Coverage

| Package | Target | Lines | Branches | Functions |
| ------- | ------ | ----- | -------- | --------- |
| Backend | 80% | 80% | 75% | 85% |
| Frontend | 70% | 70% | 65% | 75% |

Below threshold fails the build. Coverage measures what ran, not what is correct — a high number alongside a weak assertion list is worse than a lower honest one.

Excluded from measurement: generated Prisma client code, `*.config.ts`, and migration files.

---

## 7. API Documentation

### 7.1 Approach

| Approach | Decision |
| -------- | -------- |
| Hand-written YAML | Drifts from the implementation within days |
| **Annotations in route handlers → generated OpenAPI** | **Chosen** — single source of truth, impossible to drift silently |
| Postman collection export | Useful addition, not the primary artifact |

Annotations live next to the handlers (Zod schemas already define the shapes), and the document is generated at build time and served statically.

### 7.2 Served At

```text
GET /api/docs          → Swagger UI
GET /api/openapi.json  → the generated specification
```

### 7.3 Coverage Requirement

Every endpoint implemented in Phases 01 – 08 must be documented with:

- Summary and description
- Path and query parameters with types and constraints
- Request body schema
- Every response code, including the error envelope
- Authentication requirement
- At least one tagged grouping: `Auth`, `Tasks`, `Projects`, `Dashboard`

A test asserts that the path list in `openapi.json` matches the registered Express routes. Undocumented endpoints fail CI rather than being discovered in review.

---

## 8. CI Pipeline

### 8.1 Workflow

`.github/workflows/ci.yml` — triggered on `push` and `pull_request`.

```text
┌─────────────────────────────────────────────────┐
│ job: backend                                    │
│   checkout → setup pnpm → install → lint        │
│   → migrate → test → coverage gate              │
├─────────────────────────────────────────────────┤
│ job: frontend                                   │
│   checkout → setup pnpm → install → lint        │
│   → build (tsc -b) → test → coverage gate       │
├─────────────────────────────────────────────────┤
│ job: docker  (needs: backend, frontend)         │
│   docker compose config → validate              │
└─────────────────────────────────────────────────┘
```

### 8.2 Details

| Item | Decision |
| ---- | -------- |
| pnpm | Use the pinned version via `packageManager`; Corepack enabled |
| Node | 20 LTS, matrix `[20]` |
| Caching | `pnpm store` cached by lockfile hash |
| Database | PostgreSQL service container with health checks; tests wait for readiness |
| Migrations | Applied in CI, so a broken migration fails the build |
| Coverage | Uploaded as an artifact; threshold failures break the build |
| Lint | Runs before tests — cheaper failures first |
| Concurrency | Cancel superseded runs on the same branch |

### 8.3 Local Parity

CI must run the same commands a developer runs locally. A pipeline that passes while local runs fail wastes everyone's time.

---

## 9. Test Documentation

The README documents:

- How to run all tests with one command
- How to run a single file or a name pattern
- How coverage is enforced and how to read the report
- What is and is not mocked, and why
- How to add a test for a new endpoint

---

## 10. Tasks

- [ ] Add `vitest`, `@vitest/coverage-v8`, `supertest`, `@types/supertest` to the backend
- [ ] `backend/vitest.config.ts` with unit and integration projects
- [ ] Test database setup and teardown script; enable the GitHub Actions PostgreSQL service
- [ ] Write the unit tests listed in §5.1
- [ ] Aggregate the integration tests from Phases 01 – 08
- [ ] Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` to the frontend
- [ ] `frontend/vitest.config.ts` with a `jsdom` environment and a Testing Library setup file
- [ ] Write the component tests listed in §5.3, prioritised per §5.4
- [ ] Coverage configuration and thresholds per §6
- [ ] Add `test`, `test:unit`, `test:coverage`, `test:watch` scripts to both packages
- [ ] Root `pnpm test` running both packages
- [ ] Add `zod-to-openapi` (or equivalent); annotate every route from Phases 01 – 08
- [ ] Serve Swagger UI at `/api/docs` and the spec at `/api/openapi.json`
- [ ] Test asserting the documented paths match the registered routes
- [ ] `.github/workflows/ci.yml` with the three jobs in §8.1
- [ ] Cache `pnpm store`; enable Corepack; add concurrency cancellation
- [ ] Document testing in the README
- [ ] Verify a deliberately failing test turns the pipeline red

---

## 11. Acceptance Criteria

1. `pnpm test` from the repo root runs all backend and frontend tests.
2. `pnpm test:coverage` enforces the §6 thresholds and fails below them.
3. Unit tests run in under one second; the full suite completes in under two minutes.
4. Integration tests run against a real PostgreSQL database created and dropped per run.
5. Every case listed in §5 is implemented, with the §5.4 cases first if time is short.
6. `GET /api/openapi.json` documents every registered route; a test asserts parity.
7. Swagger UI is reachable at `/api/docs`.
8. The CI pipeline runs on push, fails on a broken migration, a failing test, a lint error, a build error, or a coverage shortfall.
9. CI runs the same commands documented in the README.
10. A deliberately failing test turns the pipeline red.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Serial integration tests are slow | Fresh schema per run; keep them focused on behaviour, not exhaustive combinations |
| Test database races between local and CI | Unique database name per run; CI uses a service container |
| Coverage percentage becomes a target rather than a signal | Threshold is a floor, not a goal; review assertions in code review |
| Swagger drifts from reality | Generate from handler annotations; parity test fails CI on drift |
| A green pipeline that passes locally-failing tests | CI commands are documented in the README and must match |
| CI flakiness from timing or ordering | No arbitrary sleeps — await observable state; serialise integration tests |

---

## 13. Future Phases

Deferred: Playwright end-to-end suite, visual regression, mutation testing, performance budgets, contract testing, coverage on the frontend bundle.

---

## 14. References

- SRS §15 Testability
- SRS §16 Testing, API Documentation, Continuous Integration
- SRS §17.4 Migrations & Seed
- SRS §18 Deliverables Checklist
- All backend and frontend phase documents