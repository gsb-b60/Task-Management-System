# Phase 14 — Deliverables & Submission

> **Source:** [../srs.md](../srs.md) §18 Deliverables Checklist
> **Priority:** Mandatory (Must) — DL-01 – DL-07
> **Blocks:** Nothing — this is the final phase

---

## 1. Objective

Assemble and submit the work. This phase produces the artefacts reviewers see. All items are deliverables, not code — but each requires a decision from earlier phases, and DL-07 requires the demo to actually run end to end.

---

## 2. Requirements Traceability

| ID | Deliverable | SRS Source | Satisfied by |
| -- | ----------- | ---------- | ------------ |
| DL-01 | Pull Request into the original repository | §18 | §4 |
| DL-02 | README with installation and run instructions | §18 | §5 |
| DL-03 | `.env.example`, no real secrets | §18 | §6 |
| DL-04 | Database migrations and seed/sample data | §18 | §7 |
| DL-05 | API documentation or usage guide | §18 | §8 |
| DL-06 | Completed / not-completed feature list | §18 | §9 |
| DL-07 | 3–5 minute demo video or live demo | §18 | §10 |

---

## 3. Submission Flow

Per the brief:

```text
1. Fork the repository
        ↓
2. Do the work on the fork
        ↓
3. Open a Pull Request into the original repository
        ↓
4. Send the PR link plus a description of the work
```

---

## 4. DL-01 — Pull Request

### 4.1 Branching

Work on a branch, never directly on the default branch:

```text
main
 └── feat/task-management-system     ← the PR branch
```

### 4.2 PR Description

The reviewer reads this before the code. It must stand alone:

```markdown
## Summary
What was built and why.

## Screenshots
Login, Dashboard, Task List, Board, Roadmap, API docs.

## Demo
Live URL, video link, demo credentials.

## What works
Feature-by-feature list.

## What does not work
Explicit list, with reasons.

## How to run
Prerequisites, one-command start, test command.

## Technical decisions
Stack, notable trade-offs, anything a reviewer should know.

## Known limitations
Free-tier constraints, deferred scope.
```

### 4.3 Review Quality

| Item | Requirement |
| ---- | ----------- |
| CI green | All jobs passing at the moment of review |
| No stray files | No `.env`, no `node_modules`, no editor directories, no build output |
| Commits readable | Logical commits, not one 4,000-line commit |
| No unrelated changes | Nothing outside the task's scope |
| Screenshots included | Reviewers should not need to run the app to evaluate it |

### 4.4 Pre-Submission Check

- [ ] `git status` shows a clean tree
- [ ] Repository history contains no secrets — check the diff, not just the working tree
- [ ] `.gitignore` covers `.env`, `node_modules`, `dist`, `coverage`, `.turbo`
- [ ] CI is green on the pushed branch
- [ ] PR description is complete per §4.2
- [ ] Branch is rebased on the latest `main`

---

## 5. DL-02 — README

### 5.1 Required Sections

```text
1. Title + one-paragraph description
2. Screenshots / demo GIF
3. Feature list
4. Tech stack
5. Prerequisites
6. Quick start           ← one command if possible
7. Running with Docker Compose
8. Running locally without Docker
9. Environment variables  ← table, with `.env.example` referenced
10. Database setup       ← migrate and seed
11. Running the tests
12. API documentation   ← link to /api/docs
13. Project structure
14. Design decisions and trade-offs
15. Known limitations
```

### 5.2 Quality Bar

| Rule | Why |
| ---- | --- |
| Quick start is genuinely one command | The first thing a reviewer tries |
| Every command is copy-pasteable | A wrong command costs the reviewer minutes |
| Prerequisites are listed explicitly | Node version, pnpm, Docker, PostgreSQL |
| Environment variables are tabled | Name, purpose, example value — never a real secret |
| No secrets | Not in `.env.example`, not in a code sample |

### 5.3 Project Structure

```text
todogit/
├── backend/          Node + TypeScript API
├── frontend/         React + TypeScript + Vite
├── docs/             This phase documentation
├── infra/kong/       Kong declarative config
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 6. DL-03 — `.env.example`

Every variable the application reads, with placeholder values:

```dotenv
# Backend
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todogit?schema=public"
JWT_SECRET="change-me"
JWT_EXPIRES_IN="7d"
BCRYPT_SALT_ROURS=12
FRONTEND_ORIGIN="http://localhost:5173"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:3000/api/auth/github/callback"

# Frontend
VITE_API_URL="http://localhost:3000/api"
```

Rules:

- Every variable that the app reads appears here — an undocumented variable is a setup failure for the reviewer
- No real values, no working credentials
- Comments explaining non-obvious variables
- `.env` itself is gitignored; `.env.example` is committed

---

## 7. DL-04 — Migrations and Seed

| Artefact | Location | Requirement |
| -------- | -------- | ----------- |
| Schema | `backend/prisma/schema.prisma` | All six models, enums, FKs, indexes, check constraints |
| Migrations | `backend/prisma/migrations/` | Versioned, committed, complete |
| Seed | `backend/prisma/seed.ts` | Realistic sample data |

### 7.1 Seed Content

- One demo user with known credentials, stated in the README
- Two projects — one with tasks, one empty
- At least 12 tasks spread across **every** `status` and `priority` value, so filters and the Board are demonstrably working
- At least one **overdue** task, so the Dashboard shows a non-trivial state
- At least one task per project

### 7.2 Verification

```text
1. Clone the repo fresh
2. Follow the README quick start
3. Seeded data is present
4. Board shows all three columns populated
5. Dashboard shows non-zero counts and at least one overdue
```

---

## 8. DL-05 — API Documentation

Primary artefact: Swagger / OpenAPI at `/api/docs`, generated from handler annotations (Phase 10 §7).

```markdown
### Endpoints

Authentication
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/me
  GET    /api/auth/github
  GET    /api/auth/github/callback

Tasks
  GET    /api/tasks          ?q&status&priority&page&pageSize&sortBy&sortOrder
  POST   /api/tasks
  GET    /api/tasks/:id
  PATCH  /api/tasks/:id
  DELETE /api/tasks/:id

Dashboard
  GET    /api/dashboard/summary
  GET    /api/dashboard/upcoming

Projects
  GET    /api/projects
  POST   /api/projects
  GET    /api/projects/:id
  PATCH  /api/projects/:id
  DELETE /api/projects/:id

GitHub (bonus)
  GET    /api/github/repositories
  GET    /api/github/repositories/:githubId/issues
  POST   /api/projects/:id/github-repository
  DELETE /api/projects/:id/github-repository
  POST   /api/projects/:id/import-issues

System
  GET    /health
  GET    /api/health
  GET    /api/docs
```

The README also includes a short curl example for authentication and for fetching a paginated task list — the two flows a reviewer is most likely to test by hand.

---

## 9. DL-06 — Feature Status List

Explicit, because stating what was not built is part of the deliverable.

### 9.1 Completed

```markdown
## Mandatory (MVP) — all complete

- [x] User registration
- [x] Login / logout
- [x] Secure password hashing (bcrypt, 12 rounds)
- [x] Per-user data isolation
- [x] Task CRUD
- [x] Task attributes — title, description, status, priority, start/due date
- [x] Status model — TODO / IN_PROGRESS / DONE
- [x] Search by title
- [x] Filter by status and priority
- [x] Pagination
- [x] Dashboard — totals, per-status counts, upcoming due tasks
- [x] Database migrations with foreign keys and constraints
- [x] Seed data

## Bonus — implemented

- [x] Kanban board with drag-and-drop and persistence
- [x] Docker Compose
- [x] Unit and integration tests
- [x] Swagger / OpenAPI
- [x] CI pipeline running tests on push
- [x] Demo deployment
- [x] GitHub OAuth, repository selection, issue import
- [x] Roadmap / timeline view
```

### 9.2 Not Completed

```markdown
## Not completed

- Pull-request management
- GitHub Actions management
- Commit / branch management
- Code review
- Team chat and file storage
- Full GitHub repository administration
- Organisation management

Reason: explicitly out of scope per the brief's §2.B.

- Production Kong gateway
  Reason: Kong is configured for local use via Docker Compose. Production
  deployment of the gateway is deferred until the core application works,
  as allowed by SRS §16.

- Playwright end-to-end tests
  Reason: Vitest unit, integration, and component tests cover the priority
  paths; browser automation was traded for GitHub integration and the
  Roadmap within the time budget.
```

Stating not-completed items with reasons is more credible than silence. It signals deliberate scoping rather than an omission.

---

## 10. DL-07 — Demo Video or Live Session

### 10.1 Option A — Live Demo

Shorter, and easier to keep accurate since the app is deployed (Phase 13).

```text
0:00  Register and log in
0:30  Dashboard — counts and upcoming due tasks
1:00  Create a task
1:30  Task list — search, filter by status and priority, paginate
2:30  Board — drag a card across columns, refresh to show persistence
3:15  Roadmap — timeline with dates
3:45  Swagger UI
4:15  Link a GitHub repository and import issues
```

### 10.2 Option B — 3–5 Minute Video

Record the same walkthrough. Use an unblurred terminal, keep cursor movement deliberate, and caption each step.

### 10.3 Recording Notes

- Write the script first; improvised demos drift
- Seed the database to a clean, presentable state beforehand
- Blur any real credentials appearing incidentally
- Confirm audio is audible and the resolution is readable
- Upload to a link the reviewer can reach without a request

---

## 11. Final Verification

Run in order. Nothing ships until all pass.

### 11.1 Clean-Checkout Test

The most important check — everything else assumes it.

```text
1. Clone into a fresh directory
2. Follow the README quick start exactly, as written
3. App starts, seed data present
4. pnpm test passes
5. Swagger UI loads
```

A README that only works on the machine it was written on is the most common deliverable failure.

### 11.2 Checklist

| Area | Item | Status |
| ---- | ---- | ------ |
| Docs | README complete per §5.1 | [ ] |
| Docs | `.env.example` covers every variable, no secrets | [ ] |
| Docs | DL-06 feature list written, including not-completed | [ ] |
| Docs | Demo video or live session prepared | [ ] |
| Docs | Live demo URL in the README | [ ] |
| Functionality | All mandatory features working | [ ] |
| Functionality | Board rollback on failure verified | [ ] |
| Functionality | Cross-user isolation verified | [ ] |
| Functionality | Pagination complete with no gaps or duplicates | [ ] |
| Quality | CI green on the PR branch | [ ] |
| Quality | Coverage thresholds met | [ ] |
| Quality | No lint or type errors | [ ] |
| Quality | No secrets in the repository history | [ ] |
| Quality | `.gitignore` correct; no build output committed | [ ] |
| Docker | `docker compose up` works on a clean machine | [ ] |
| Docker | `--profile gateway` works | [ ] |
| API | Every route documented in OpenAPI | [ ] |
| Repo | PR opened into the original repository | [ ] |
| Repo | PR description complete | [ ] |

---

## 12. Tasks

- [ ] Write the README per §5.1 with verified commands
- [ ] Add a `.env.example` covering every variable
- [ ] Verify the clean-checkout test on a fresh clone
- [ ] Write the DL-06 feature status list
- [ ] Prepare the demo script; record the video or schedule the live session
- [ ] Add the live demo URL and demo credentials to the README
- [ ] Add screenshots to the README and the PR
- [ ] Run the §11.2 checklist
- [ ] Run `git log -p` for a final secret scan
- [ ] Rebase the branch on the latest `main`
- [ ] Open the Pull Request
- [ ] Send the PR link with a description of the work

---

## 13. Acceptance Criteria

1. All seven deliverables exist and are reachable by the reviewer.
2. A reviewer can clone the repository and get a running app by following the README, without asking a question.
3. `.env.example` covers every environment variable and contains no real secrets.
4. Migrations and seed run from a clean checkout and produce demo-ready data.
5. Every API route is documented in Swagger / OpenAPI.
6. The feature status list is honest about what was not built, with reasons.
7. A demo is available as a video or a live session.
8. CI is green on the PR branch.
9. The repository history contains no secrets.
10. A Pull Request is open against the original repository with a complete description.

---

## 14. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| README works only on the authoring machine | Clean-checkout test on a fresh clone, run by someone other than the author if possible |
| Feature list overstates what works | Verify every claim against the running app before writing it |
| Secrets committed earlier in history | `git log -p` scan; rotate anything that surfaces |
| Demo video shows stale UI | Re-record after the final deploy; write the script first |
| Seed data modified during the demo | Re-seed immediately before recording |
| Reviewer cannot start the app quickly | One-command quick start as the first substantive section |
| PR too large to review meaningfully | Logical commit history; PR description summarises before the code |

---

## 15. References

- SRS §18 Deliverables Checklist
- Origin brief §2 (submission flow) and §5 (checklist bàn giao)
- All phase documents in this directory