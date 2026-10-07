# Phase 03 — Backend: Search, Filter & Pagination

> **Source:** [../srs.md](../srs.md) §6, §15 Scalability
> **Priority:** Mandatory (Must) · FR-12 – FR-15
> **Blocks:** Phase 04 (uses the same query builder), Phase 06 (frontend task list)

---

## 1. Objective

Add title search, status and priority filtering, and pagination to the task list, so the list stays fast and bounded as the dataset grows. This phase also introduces the paginated response envelope reused by every list endpoint for the rest of the project.

---

## 2. Scope

### 2.1 In Scope

- Case-insensitive partial search on `title`
- Filter by one or more `status` values
- Filter by one or more `priority` values
- Filters combinable with each other and with search
- Pagination: `page`, `pageSize`, `sortBy`, `sortOrder`
- The `{ data, meta }` response envelope
- Required indexes on `userId`, `status`, `priority`, `dueDate`
- Project-based scoping via `projectId`

### 2.2 Out of Scope

- Full-text search across `description` (Phase 03 covers `title` only, per SRS §6.1)
- Cursor-based pagination
- Saved / preset filters
- Dashboard aggregation (Phase 04)

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-12 | User can search tasks by title | §6.1 |
| FR-13 | User can filter tasks by status | §6.2 |
| FR-14 | User can filter tasks by priority | §6.2 |
| FR-15 | Task lists are paginated | §6.3 |
| — | Indexes on `userId`, `status`, `priority`, `dueDate` | §15 Scalability |
| — | `pageSize` capped at 100 | §15 Scalability |
| — | Bounded response size | §15 Performance |

---

## 4. Query Parameters

| Parameter   | Type     | Default   | Validation | Notes |
| ----------- | -------- | --------- | ---------- | ----- |
| `q`         | String   | —         | ≤ 200 chars | Case-insensitive partial match on title |
| `status`    | Enum[]   | —         | Repeatable, comma-separated also accepted | `TODO` \| `IN_PROGRESS` \| `DONE` |
| `priority`  | Enum[]   | —         | Repeatable, comma-separated also accepted | `LOW` \| `MEDIUM` \| `HIGH` |
| `projectId` | UUID     | —         | Must be owned by caller | |
| `page`      | Integer  | `1`       | ≥ 1 | 1-indexed |
| `pageSize`  | Integer  | `20`      | 1 – 100 | Clamped at 100, not an error |
| `sortBy`    | String   | `dueDate` | `dueDate` \| `createdAt` \| `updatedAt` \| `priority` \| `status` \| `title` | |
| `sortOrder` | String   | `asc`     | `asc` \| `desc` | |

Both these forms are accepted:

```text
?status=TODO&status=DONE
?status=TODO,DONE
```

---

## 5. Behaviour

### 5.1 Composition

```text
WHERE userId = <session>
  AND (search)              ← q
  AND status  IN (…)        ← status
  AND priority IN (…)       ← priority
  AND projectId = …         ← projectId
ORDER BY <sortBy> <sortOrder>, id ASC
LIMIT pageSize OFFSET (page - 1) * pageSize
```

A stable tiebreaker on `id` is always appended. Without it, rows with equal sort keys can shift between pages on refresh and a task appears twice or vanishes.

### 5.2 Search

```text
Search: "login"
Matches: "Fix login redirect", "Login page rewrite", "Add logout button"
```

Implementation: Prisma `contains` with `mode: 'insensitive'`. Case-insensitivity relies on the Postgres `citext` extension or a functional index — see §7.2.

If searching on a large table starts to dominate query time, escalate to Postgres full-text search in a later phase. The response contract does not change.

### 5.3 Nulls in Sorting

`dueDate` and `startDate` are nullable. Tasks with no due date sort last in `asc` order rather than first, so "no deadline" does not dominate the top of the list:

```text
sortOrder = asc   →  NULLS LAST
sortOrder = desc  →  NULLS FIRST
```

### 5.4 Empty Results

An empty page returns `200` with `"data": []` and honest metadata. A request for page 99 of 7 returns an empty array with `totalPages: 7` — not a 404.

---

## 6. Response Envelope

This shape is the project's list contract. Every future list endpoint uses it.

```json
{
  "data": [
    { "id": "c41f…", "title": "Fix login redirect", "status": "TODO", "priority": "HIGH", "…": "…" }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 137,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 7. Performance

### 7.1 Indexes

Added in this phase, matching SRS §15 Scalability:

| Index | Serves |
| ----- | ------ |
| `Task(userId)` | The mandatory ownership predicate on every query |
| `Task(userId, status)` | Status-filtered lists |
| `Task(userId, priority)` | Priority-filtered lists |
| `Task(userId, dueDate)` | Default sort and Dashboard due-date lookups |
| `Task(title)` functional, case-insensitive | Title search |

`User.email`, `Session.token`, and `Session.expiresAt` are indexed from Phase 00.

### 7.2 Case-Insensitive Search

`mode: 'insensitive'` compiles to `ILIKE '%q%'`, which cannot use a plain B-tree index. Two options, chosen together:

1. `citext` extension on `Task.title` — makes equality and `ILIKE` indexable.
2. A GIN trigram index (`pg_trgm`) on `Task.title` — makes `ILIKE '%q%'` indexable for substring search.

`pg_trgm` is the correct fit for partial-match search; `citext` alone will not index a leading `%` query. Enable the extension in the migration and add the GIN index.

### 7.3 Counting

`count()` runs a second query. Acceptable at this scale; if it becomes the bottleneck, cache counts per filter combination or move to a window-function count in one round trip.

### 7.4 Verified Query Plan

Before this phase is called done, confirm with `EXPLAIN ANALYZE` that a filtered, sorted, paginated query uses the indexes and does not sequentially scan.

---

## 8. API Surface

### `GET /api/tasks`

Behind `requireAuth`. See §4 for parameters and §6 for the response.

**400 `VALIDATION_ERROR`** — malformed `page`, non-enum `status`, out-of-range `pageSize` that is not numeric, unparseable `sortBy`.

**200 OK** — paginated envelope.

### 8.1 Examples

```text
GET /api/tasks?q=login
GET /api/tasks?status=TODO&status=IN_PROGRESS
GET /api/tasks?status=DONE&priority=HIGH
GET /api/tasks?q=login&status=TODO&sortBy=dueDate&sortOrder=asc&page=2&pageSize=10
```

```json
{
  "data": [
    { "id": "c41f…", "title": "Fix login redirect", "status": "TODO", "priority": "HIGH", "dueDate": "2026-10-15T00:00:00.000Z", "…": "…" }
  ],
  "meta": {
    "page": 2,
    "pageSize": 10,
    "totalItems": 137,
    "totalPages": 14,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

---

## 9. Code Structure

Layer rules in [architecture-backend.md](architecture-backend.md) §3. Files from Phase 02, relocated into the three layers.

```text
src/presentation/tasks/
├── tasks.schemas.ts       # Zod: listQuery with coercion + defaults
└── __tests__/

src/service/
├── tasks.service.ts       # search / filter / paginate orchestration
└── __tests__/

src/repository/
└── task.repository.ts     # query builder — the single place filters live

src/lib/
└── pagination.ts          # parse page/pageSize, clamp, skip/take, build meta
```

The Phase 02 `task.repository.ts` query builder is extended rather than duplicated, so filters are composed in exactly one place. Phase 04 reuses the same builder for the Dashboard counts.

---

## 10. Tasks

- [ ] Zod `listQuery` schema: coerce `page` / `pageSize` from string, apply defaults, clamp `pageSize` to 100
- [ ] Parse `status` / `priority` as both repeatable and comma-separated
- [ ] `src/lib/pagination.ts` — `skip` / `take` / `offset` and the `meta` builder
- [ ] `src/repository/task.repository.ts` — compose the where clause and sort
- [ ] Add the stable `id ASC` tiebreaker to every sort
- [ ] Handle nullable `dueDate` ordering per §5.3
- [ ] Migration: enable `pg_trgm`, add `citext` to `Task.title`
- [ ] Migration: add the indexes in §7.1
- [ ] Update `GET /api/tasks` to return the `{ data, meta }` envelope
- [ ] Confirm `totalItems` and `totalPages` reflect the filters, not the whole table
- [ ] Run `EXPLAIN ANALYZE` and record the plan for a filtered + sorted + paginated query

---

## 11. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| No params → page 1, `pageSize` 20, default sort | integration | |
| `q=login` matches titles containing "login" | integration | |
| `q=LOGIN` matches the same rows — case-insensitive | integration | |
| `q=zzzzznomatch` → empty data, `totalItems: 0`, `totalPages: 0` | integration | |
| `status=TODO` returns only `TODO` tasks | integration | |
| `status=TODO,DONE` returns the union, excludes `IN_PROGRESS` | integration | |
| Repeatable form `status=TODO&status=DONE` matches the comma form | integration | parity |
| `priority=HIGH` returns only `HIGH` | integration | |
| `q` + `status` + `priority` compose correctly | integration | intersection, not union |
| `page=2` returns a disjoint set from page 1 | integration | no overlap |
| Union of page 1..N equals the full filtered set exactly once | integration | pagination correctness — the key test |
| `pageSize=500` is clamped to 100 | integration | |
| `page=0` or `page=-1` → 400 | integration | |
| `page=99` of 7 → empty data, `totalPages: 7` | integration | not a 404 |
| `sortBy=dueDate&sortOrder=asc` orders correctly, nulls last | integration | |
| `sortOrder=desc` orders correctly, nulls first | integration | |
| `sortBy=title` produces a stable order across repeated identical calls | integration | tiebreaker present |
| Invalid `status=MAYBE` → 400 | integration | enum validation |
| Results never include another user's tasks, under any filter combination | integration | isolation holds with filters applied |
| `EXPLAIN` on the standard query shows an index scan | performance | recorded in the PR |

---

## 12. Acceptance Criteria

1. `q` matches titles partially and case-insensitively.
2. `status` and `priority` filters work individually, together, and combined with `q` — always as an intersection.
3. Every page of a filtered list is disjoint, and the union of all pages contains each matching task exactly once.
4. `pageSize` cannot exceed 100, and `page < 1` is rejected.
5. Response metadata — `totalItems`, `totalPages`, `hasNextPage`, `hasPreviousPage` — is accurate for the active filters.
6. Sorting is deterministic: repeated identical requests return identical orderings.
7. Tasks with no due date sort last in ascending order.
8. `EXPLAIN ANALYZE` confirms index usage on the standard query.
9. A user cannot retrieve another user's tasks via any filter combination.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Duplicated or skipped rows across pages | Append an `id` tiebreaker; test the union-of-pages property |
| `ILIKE '%q%'` degrades to a sequential scan | `pg_trgm` GIN index; verify with `EXPLAIN ANALYZE` before closing the phase |
| `count()` doubles query latency | Acceptable at this scale; cache or window-count if profiling shows it matters |
| Invalid query params silently coerce to defaults | Coerce types, but reject out-of-range and non-enum values with 400 |
| Frontend written against the Phase 02 list shape breaks | Frontend task list is built in Phase 06, after this phase |

---

## 14. Future Phases

Deferred: cursor pagination, search across `description`, full-text ranking, saved filters, bulk operations across a selection.

---

## 15. References

- SRS §6 Search, Filter & Pagination
- SRS §15 Performance, §15 Scalability
- [Phase 02 — Backend: Task CRUD](phase-02-backend-task-crud.md)