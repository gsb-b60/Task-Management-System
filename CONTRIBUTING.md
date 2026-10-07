# Contributing

Contribution guidelines for **Git Project Manager**.

Before you start, read [srs.md](srs.md) for what the system must do, and [docs/README.md](docs/README.md) for the phase breakdown and which phase you are picking up.

---

## Quick Reference

| Rule | Value |
| ---- | ----- |
| Branch per feature | `feat/backend-task-crud`, `fix/board-rollback` |
| Branched from | `main` (always up to date) |
| Commit format | Conventional Commits — `feat(backend): add task CRUD endpoints` |
| Merged via | Pull Request into `main` |
| PR title | Same format as the commit |
| Tests | Required before a PR is merged |

---

## 1. Workflow

Every feature gets its own branch, developed in isolation, then merged into `main` through a Pull Request.

```text
main
 │
 ├── git checkout -b feat/backend-task-crud      ← new branch
 │      ├── commit, commit, commit               ← focused work
 │      └── pnpm test                             ← must pass locally
 │
 └── git checkout main
        git merge feat/backend-task-crud          ← or open a PR
```

### 1.1 Starting a Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/backend-task-crud
```

Never branch from a stale `main`. A rebase conflict at merge time wastes more time than the pull cost.

### 1.2 Naming Branches

```text
<type>/<scope>-<short-description>
```

| Example | Purpose |
| ------- | ------- |
| `feat/backend-auth-register` | New register endpoint |
| `feat/frontend-task-list` | New task list screen |
| `fix/backend-pagination-duplicates` | Bug fix |
| `docs/add-contributing-guide` | Documentation |
| `chore/deps-bump-prisma` | Dependency or tooling change |

Rules:
- Lowercase, hyphen-separated
- Prefix with the Conventional Commit type — the branch and its commits should agree
- Scope optional but useful in a two-package repo (`backend`, `frontend`, `docs`, `infra`)
- Keep it short enough to read in a branch list

### 1.3 Merging

- Merge through a **Pull Request** — direct pushes to `main` are not accepted
- The PR must be green on CI before merge
- Prefer **Squash merge** so `main` history stays one line per feature, matching the branch granularity

```text
Squash:  1 commit per feature on main
Merge:   a merge commit plus every intermediate commit
```

Squash is the cleaner history here because each branch is one feature.

---

## 2. Commit Messages

Conventional Commits.

```text
<type>(<scope>): <description>
```

### 2.1 Format Rules

| Rule | Detail |
| ---- | ------ |
| Type | Lowercase, from the list in §2.2 |
| Scope | The package or area — `backend`, `frontend`, `docs`, `infra` |
| Description | Imperative mood — "add", not "added" or "adds" |
| Length | ≤ 72 characters for the subject line |
| No period | Do not end the subject with `.` |
| Language | English |

```text
feat(backend): add task CRUD endpoints
fix(frontend): restore card column on failed board move
docs(backend): document pagination query parameters
```

### 2.2 Types

| Type | Use for | Example |
| ---- | ------- | ------- |
| `feat` | New user-visible functionality | `feat(backend): add password hashing with bcrypt` |
| `fix` | Bug fix | `fix(backend): return 404 instead of 403 for other users' tasks` |
| `docs` | Documentation only | `docs: add phase 12 docker compose spec` |
| `refactor` | Behaviour-preserving restructure | `refactor(backend): extract pagination helper` |
| `perf` | Performance improvement | `perf(backend): add pg_trgm index for title search` |
| `test` | Adding or fixing tests | `test(backend): add pagination union completeness case` |
| `build` | Build system, dependencies, Dockerfiles | `build(backend): add multi-stage Dockerfile` |
| `ci` | GitHub Actions, pipeline config | `ci: run tests on push` |
| `chore` | Tooling, config, housekeeping | `chore: add .env.example` |
| `revert` | Reverts a previous commit | `revert: revert "feat(backend): add task search"` |

### 2.3 Scopes

| Scope | Covers |
| ----- | ------ |
| `backend` | Node API, Prisma, database |
| `frontend` | React app |
| `docs` | `docs/`, SRS, README |
| `infra` | Docker Compose, Kong, CI |

Sub-scopes are allowed: `feat(backend/auth): ...`, `feat(frontend/board): ...`

### 2.4 Optional Body

Use a body when the *why* is not obvious from the subject. Wrap at 72 characters.

```text
feat(backend): return 404 for tasks owned by another user

The previous implementation used findUnique by id, which confirmed
that another user's task existed before rejecting access.

Switching to findFirst with userId in the where clause removes the
existence signal, so a cross-user probe returns the same response as
a nonexistent id.

Refs: SRS §15 Security
```

```text
perf(backend): add pg_trgm index for task title search

mode: 'insensitive' compiles to ILIKE '%q%', which cannot use a plain
B-tree index. The trigram GIN index brings a filtered search back
under 50 ms on 10k rows.

EXPLAIN ANALYZE before: Seq Scan on Task  (842 ms)
EXPLAIN ANALYZE after:  Bitmap Index Scan (12 ms)
```

### 2.5 Optional Footer

Reference issues and breaking changes.

```text
Refs: #42
Part of: docs/phase-03-backend-search-filter-pagination.md
Closes: #42
```

A `BREAKING CHANGE:` footer marks an API contract change:

```text
feat(backend)!: change task list response to include meta

BREAKING CHANGE: GET /api/tasks now returns { data, meta } instead of
a bare array. Clients must read items from data and pagination from meta.
```

### 2.6 Examples

**Good**

```text
feat(backend): add register endpoint with bcrypt hashing
fix(backend): scope task queries by authenticated user
docs(frontend): document query cache key structure
test(backend): add isolation cases for every task route
build(backend): run as non-root in the runtime image
chore: add .env.example with placeholder values
```

**Bad**

```text
update code
fixed bug
feat: stuff
FEAT(BACKEND): Add Thing
feat(backend): added the thing.
```

### 2.7 One Feature Per Commit

A commit does one thing. A commit that touches the schema, the service, the route, and the frontend in one step is three or four commits.

```text
Bad
  feat: add task CRUD        ← schema + service + route + UI

Good
  feat(backend): add Task model and migration
  feat(backend): add task service with ownership scoping
  feat(backend): add task CRUD routes
  feat(frontend): add task detail form
```

Each commit should leave the repository in a working state — no commit should break the build.

---

## 3. Pull Requests

### 3.1 Title

Same format as the commit, because squash merge uses it.

```text
feat(backend): add task CRUD endpoints
```

### 3.2 Description Template

```markdown
## Summary
What changed and why.

## Changes
- Bullet per meaningful change

## Testing
- Manual steps, or "covered by automated tests"

## Closes
- #<issue>
```

### 3.3 Before Requesting Review

- [ ] Branch is up to date with `main`
- [ ] `pnpm test` passes locally
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] Commits follow the format in §2
- [ ] One feature per branch — nothing unrelated
- [ ] No `.env`, `node_modules`, `dist`, or `coverage` staged
- [ ] Documentation updated if behaviour or setup changed

### 3.4 Merging Checklist

- [ ] CI green — tests, lint, build
- [ ] Required phase acceptance criteria met
- [ ] No secrets in the diff
- [ ] Reviewer approved

---

## 4. Testing Requirements

Tests are not optional for a PR. Phase 10 in [docs/README.md](docs/README.md) specifies the suites and the coverage thresholds.

| Package | Command | Threshold |
| ------- | ------- | --------- |
| Backend | `pnpm --filter backend test` | 80% lines, 75% branches |
| Frontend | `pnpm --filter frontend test` | 70% lines, 65% branches |
| Everything | `pnpm test` | both |

Coverage below threshold fails the build. A high number with weak assertions is worse than a lower honest one — assert on behaviour, not on the fact that a line ran.

---

## 5. Code Style

### 5.1 Formatting

Prettier, matching the existing configuration. No manual alignment.

### 5.2 Linting

```bash
pnpm --filter backend lint
pnpm --filter frontend lint
```

TypeScript `strict` is on. No `any` without a comment explaining why. No `@ts-ignore` — if the type is wrong, fix the type.

### 5.3 Naming

| Kind | Convention | Example |
| ---- | ---------- | ------- |
| Files | `kebab-case.ts` | `due-date.ts` |
| Components | `PascalCase.tsx` | `TaskForm.tsx` |
| Functions, variables | `camelCase` | `daysUntilDue` |
| Types, interfaces | `PascalCase` | `TaskStatus` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_PAGE_SIZE` |
| Database tables | `PascalCase` singular | `Task`, `Project` |
| Enum values | `SCREAMING_SNAKE_CASE` | `IN_PROGRESS` |
| API paths | `kebab-case`, plural nouns | `/api/tasks`, `/api/dashboard/summary` |

### 5.4 Imports

Aliases over deep relative paths:

```text
Good:  import { prisma } from '../lib/prisma'
Bad:   import { prisma } from '../../../lib/prisma'
```

### 5.5 Errors

Always throw or return the shared `AppError` so responses use the envelope from Phase 00 §8.

```text
Good:  throw new AppError('NOT_FOUND', 'Task not found', 404)
Bad:   throw new Error('not found')
Bad:   res.status(404).json({ error: 'not found' })   ← bypasses the envelope
```

### 5.6 Never Commit

```text
.env                 any real secret
node_modules/
dist/
coverage/
*.log
.DS_Store
```

---

## 6. Migrations

Schema changes ship as a versioned migration. Never hand-edit the database.

```bash
pnpm --filter backend exec prisma migrate dev --name add_task_labels
```

Commit both files:

```text
backend/prisma/schema.prisma
backend/prisma/migrations/<timestamp>_add_task_labels/migration.sql
```

| Rule | Detail |
| ---- | ------ |
| One migration per logical change | Not one per file edit |
| Include in the same commit as the code that uses it | A schema change without its consumer is incomplete |
| Forward-compatible in production | Rename via add → backfill → drop, across separate deploys |
| `migrate dev` locally, `migrate deploy` in production | `migrate dev` can reset data |

---

## 7. Adding a Feature

```bash
# 1. Sync and branch
git checkout main
git pull origin main
git checkout -b feat/backend-task-labels

# 2. Develop with small, focused commits
git add backend/src/presentation/tasks backend/src/service backend/src/repository
git commit -m "feat(backend): add labels field to task schema"

git add backend/prisma/migrations
git commit -m "chore(backend): add labels migration"

# 3. Test before pushing
pnpm test
pnpm --filter backend lint

# 4. Push and open a PR
git push -u origin feat/backend-task-labels
```

Then open the PR against `main` with the title from §3.1 and the template from §3.2.

---

## 8. Existing History

The initial commits on `main` predate this convention (`Update README.md`, `Initial commit`) and are left as-is. Do not rewrite published history — new work follows this guide.

---

## 9. Reporting Bugs

Include:

- What you did
- What you expected
- What happened
- Steps to reproduce
- Browser, Node version, and whether you ran via Docker or locally
- A screenshot or error log if relevant

---

## 10. Getting Help

- [srs.md](srs.md) — what the system must do
- [docs/README.md](docs/README.md) — phase index and dependency order
- `docs/phase-NN-*.md` — the spec for a phase, including its acceptance criteria
- Swagger at `/api/docs` once the backend runs

Each phase document lists its own requirements, tests, and acceptance criteria — start there before writing code.