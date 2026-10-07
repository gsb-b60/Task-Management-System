# Project Documentation

Phase-by-phase specifications for **Git Project Manager**, derived from [../srs.md](../srs.md).

**Source of truth:** `srs.md`. If a phase document and the SRS disagree, the SRS wins.

---

## Ordering

Backend first — every frontend phase depends on an API contract already existing and tested.

```text
PHASE 00 ──▶ 01 ──▶ 02 ──▶ 03 ──▶ 04      Backend
   foundation  auth   CRUD   search  dashboard
                              │
                              ▼
PHASE 05 ──▶ 06 ──▶ 07 ──▶ 08 ──▶ 09      Frontend
   auth        tasks  board  projects  roadmap
                              │
                              ▼
PHASE 10 ──▶ 11 ──▶ 12 ──▶ 13 ──▶ 14      Quality / Infra / Submission
   tests       github docker  deploy    deliverables
```

---

## Architecture

| Document | Covers |
| -------- | ------ |
| [Backend Layer Structure](architecture-backend.md) | presentation → service → repository, dependency rule, naming, request lifecycle, phase-to-file map |

The API runs on **port 5004** in development.

---

## Phase Index

### Backend — Mandatory

| Phase | Document | Covers | SRS |
| ----- | -------- | ------ | --- |
| 00 | [Backend Foundation](phase-00-backend-foundation.md) | Node/TS setup, Prisma schema, all six models, migrations, seed, error envelope, `.env` | §13, §15, §16, §17 |
| 01 | [Accounts & Authentication](phase-01-backend-auth.md) | Register, login, logout, bcrypt, sessions, `requireAuth`, GitHub OAuth | §3, §4 |
| 02 | [Task CRUD](phase-02-backend-task-crud.md) | Create/read/update/delete, attributes, validation, ownership isolation | §5, §8 |
| 03 | [Search, Filter & Pagination](phase-03-backend-search-filter-pagination.md) | Title search, status/priority filters, pagination envelope, indexes, `pg_trgm` | §6 |
| 04 | [Dashboard](phase-04-backend-dashboard.md) | Totals, per-status counts, upcoming due tasks, overdue flagging | §7 |

### Frontend — Mandatory

| Phase | Document | Covers | SRS |
| ----- | -------- | ------ | --- |
| 05 | [Auth, Layout & API Client](phase-05-frontend-auth.md) | API client, auth context, route guards, Register/Login screens, app shell | §3, §13.1–2 |
| 06 | [Task List & Dashboard](phase-06-frontend-tasks-dashboard.md) | Dashboard, searchable/filterable/paginated task list, task detail, cache invalidation | §6, §7, §13.3–4, §13.8 |
| 08 | [Projects](phase-08-backend-frontend-projects.md) | Project CRUD, project switcher, `?projectId=` scoping | §12, §13.5 |

### Bonus Features

| Phase | Document | Covers | SRS |
| ----- | -------- | ------ | --- |
| 07 | [Kanban Board](phase-07-frontend-kanban-board.md) | Drag-and-drop, **optimistic update with rollback**, keyboard parity | §7, §9 |
| 09 | [Roadmap](phase-09-frontend-roadmap.md) | Timeline, bar layout, timezone-safe dates, undated lane | §11 |
| 11 | [GitHub Integration](phase-11-github-integration.md) | Repository listing, association, issue import, status independence, rate limits | §4, §10, §12.2 |

### Quality, Infrastructure, Submission

| Phase | Document | Covers | SRS |
| ----- | -------- | ------ | --- |
| 10 | [Testing, API Docs & CI](phase-10-testing-api-docs-ci.md) | Vitest, integration DB, coverage thresholds, Swagger, GitHub Actions | §15, §16, DL-04/05 |
| 12 | [Docker Compose & Kong](phase-12-docker-kong.md) | Multi-stage builds, Compose, health checks, Kong declarative config | §16, DL-02 |
| 13 | [Deployment](phase-13-deployment.md) | Render, migrations at deploy, post-deploy verification | §16 |
| 14 | [Deliverables & Submission](phase-14-deliverables.md) | PR, README, `.env.example`, feature status list, demo | §18, DL-01–07 |

---

## Mandatory vs. Bonus

Split per the origin brief's structure.

### Mandatory — required to ship

| Feature | Phase | FR |
| ------- | ----- | -- |
| Register / login / logout | 01, 05 | FR-01–03 |
| Password hashing | 01 | FR-04 |
| Per-user data isolation | 01, 02 | FR-05 |
| Task CRUD | 02, 06 | FR-06–09 |
| Task attributes and status model | 02 | FR-10, FR-11 |
| Search by title | 03, 06 | FR-12 |
| Filter by status and priority | 03, 06 | FR-13, FR-14 |
| Pagination | 03, 06 | FR-15 |
| Dashboard counts | 04, 06 | FR-16–19 |
| Dashboard upcoming due list | 04, 06 | FR-20 |

### Bonus — scoring features

| Feature | Phase | FR |
| ------- | ----- | -- |
| Kanban board + drag-and-drop | 07 | FR-21, FR-22 |
| GitHub OAuth, repositories, issues | 01, 11 | FR-23–26 |
| Roadmap / timeline | 09 | FR-27 |
| Docker Compose | 12 | FR-28 |
| Swagger / OpenAPI | 10 | FR-29 |
| CI pipeline | 10 | FR-30 |

---

## Critical Design Decisions

Points where a wrong choice causes a real bug. Each is called out in its phase document with tests.

| Decision | Phase | Why it matters |
| -------- | ----- | -------------- |
| **Board rollback on failure** | 07 | SRS §9.3 — a failed status update must not silently lose state. Optimistic update with snapshot-based rollback. |
| **GitHub status ≠ Kanban status** | 11 | SRS §8 — imported issues always start at `TODO`, regardless of GitHub `open`/`closed`. Never write back to GitHub. |
| **Pagination union completeness** | 03 | Pages must be disjoint and their union exact. Silent duplication or loss of tasks. |
| **Server-side overdue flag** | 04, 06, 09 | `isOverdue` and `daysUntilDue` are computed server-side. A client clock in another timezone disagrees. |
| **Date-only values are local** | 02, 09 | Parse `2026-10-15` as a local date, not `new Date("2026-10-15")` which is UTC midnight and renders as the 14th west of Greenwich. |
| **Login error parity** | 01 | Unknown email and wrong password return identical status, code, message, **and timing**. |
| **404 not 403 for other users' resources** | 02, 08 | A 403 confirms the resource exists. Do not leak existence. |
| **`VITE_API_URL` is build-time** | 12, 13 | Vite inlines `VITE_*` during build. Setting it after the build does nothing. |
| **Kong is not the auth boundary** | 12 | The API enforces auth. Kong is optional and not in the default Compose profile. |
| **Migrate runs before traffic** | 13 | `migrate deploy` as a release step, never `migrate dev` in production. |

---

## Testing Strategy

Full detail in [Phase 10](phase-10-testing-api-docs-ci.md).

| Layer | Scope | Location |
| ----- | ----- | -------- |
| Unit | Pure logic — dates, layout, password, pagination, mappers | co-located `__tests__` |
| Integration | HTTP routes against a real test database | `*.integration.test.ts` |
| Component | React components and hooks, mocked API | `frontend/src/**/*.test.tsx` |

| Target | Lines | Branches | Functions |
| ------ | ----- | -------- | --------- |
| Backend | 80% | 75% | 85% |
| Frontend | 70% | 65% | 75% |

Every phase document lists the tests it requires. If time is short, Phase 10 §5.4 names the six highest-value cases.

---

## Requirement Traceability

| SRS Section | Phases |
| ----------- | ------ |
| §3 Account Management | 01, 05 |
| §4 GitHub Authentication | 01, 11 |
| §5 Task Management | 02, 06 |
| §6 Search, Filter, Pagination | 03, 06 |
| §7 Dashboard | 04, 06 |
| §6 Task Status | 02, 07 |
| §7 Kanban Board | 07 |
| §8 Roadmap | 09 |
| §9 Project Creation | 08 |
| §10 Main Screens | 05, 06, 07, 08, 09 |
| §11 Functional Requirements | all |
| §12 Non-Functional Requirements | 00, 01, 03, 04, 10, 12, 13 |
| §13 Technology Stack | 00, 05, 10, 12 |
| §14 Architecture | 00 |
| §15 MVP Development Order | this index |
| §16 Success Criteria | 10, 14 |
| §17 Database Design | 00 |
| §18 Deliverables | 10, 12, 13, 14 |

---

## Document Conventions

Each phase document contains:

```text
1.  Objective          — one paragraph
2.  Scope              — in / out of scope
3.  Traceability       — requirement IDs → SRS clauses
4.  Design decisions   — choices with rationale
5.  API surface        — endpoints, requests, responses, errors
6.  Code structure     — files to create or modify (layout: see [Backend Layer Structure](architecture-backend.md))
7.  Tasks              — checklist
8.  Tests              — table of required cases
9.  Acceptance criteria — verifiable statements
10. Risks              — with mitigations
```

Frontmatter lines under the title give the SRS sections, priority (`Must` / `Bonus`), and dependency (`Blocks:` / `Blocked by:`).

---

## Working Order

```text
Phase 00  foundation            ← do first, gates everything
Phase 01  auth
Phase 02  task CRUD
Phase 03  search/filter/paging  ← needed before the frontend task list
Phase 04  dashboard
Phase 10  tests + CI            ← partial, then backfilled each phase
Phase 05  frontend auth
Phase 06  frontend tasks + dashboard
Phase 08  projects
Phase 07  kanban board          ← bonus
Phase 09  roadmap               ← bonus
Phase 11  github integration    ← bonus
Phase 12  docker + kong         ← bonus
Phase 13  deployment            ← bonus
Phase 14  deliverables          ← always last
```

Run the backend suite after every backend phase and the frontend suite after every frontend phase. Phase 10 §8.3 requires CI to run exactly what runs locally.