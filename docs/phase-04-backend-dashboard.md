# Phase 04 — Backend: Dashboard

> **Source:** [../srs.md](../srs.md) §7
> **Priority:** Mandatory (Must) · FR-16 – FR-20
> **Blocks:** Phase 06 (frontend dashboard)

---

## 1. Objective

Deliver the aggregate statistics and upcoming-due-tasks list required by SRS §7, scoped to the authenticated user.

---

## 2. Scope

### 2.1 In Scope

- `GET /api/dashboard/summary` — total and per-status counts
- `GET /api/dashboard/upcoming` — tasks approaching or past their due date
- Reuse of the Phase 03 query builder and pagination envelope
- Overdue flagging

### 2.2 Out of Scope

- Charts or graphical breakdown beyond counts
- Team or multi-user aggregation
- Custom date-range windows
- Caching layer (noted as a future optimisation, §12)
- Frontend rendering (Phase 06)

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-16 | Dashboard shows total task count | §7.1 |
| FR-17 | Dashboard shows count of completed tasks | §7.1 |
| FR-18 | Dashboard shows count of in-progress tasks | §7.1 |
| FR-19 | Dashboard shows count of not-started tasks | §7.1 |
| FR-20 | Dashboard lists tasks approaching their due date | §7.2 |

---

## 4. API Surface

### 4.1 `GET /api/dashboard/summary`

Behind `requireAuth`. Optional `?projectId=` to scope to one project.

**200 OK**

```json
{
  "data": {
    "total": 137,
    "byStatus": {
      "TODO": 37,
      "IN_PROGRESS": 52,
      "DONE": 48
    },
    "overdue": 6,
    "dueToday": 3
  }
}
```

### 4.2 `GET /api/dashboard/upcoming`

Behind `requireAuth`. Reuses the full Phase 03 query contract — `q`, `status`, `priority`, `page`, `pageSize`, `sortBy`, `sortOrder`.

**200 OK**

```json
{
  "data": [
    {
      "id": "c41f…",
      "title": "Fix login redirect",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "dueDate": "2026-10-08T00:00:00.000Z",
      "isOverdue": true,
      "daysUntilDue": -1
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 9,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

---

## 5. Behaviour

### 5.1 Counts

All four counts come from a single `groupBy` on `status`, not four separate queries.

```text
total = sum of all groupBy rows
TODO / IN_PROGRESS / DONE = the respective rows
```

```text
┌──────────────────┬───────┐
│ status           │ count │
├──────────────────┼───────┤
│ IN_PROGRESS      │    52 │
│ TODO             │    37 │
│ DONE             │    48 │
└──────────────────┴───────┘
total = 52 + 37 + 48 = 137
```

If a status is absent from the result set, its count is `0` — never `undefined`.

### 5.2 Upcoming Task Selection

Default behaviour, no query parameters required:

- Include tasks with a non-null `dueDate`
- **Exclude `DONE` tasks** — finished work is not upcoming
- Order by `dueDate` ascending, nulls last
- Default `pageSize` of `10`

```text
Include:  dueDate IS NOT NULL AND status != 'DONE'
Exclude:  dueDate IS NULL, status = 'DONE'
Order:    dueDate ASC
```

### 5.3 Overdue Determination

```text
isOverdue  = dueDate < now() AND status != 'DONE'
daysUntilDue = calendar days from today to dueDate
              → negative when overdue
              → 0       when due today
              → positive when upcoming
```

Days are computed as calendar-day boundaries in the **user's timezone**, not raw 24-hour deltas. "Due today" means the same local calendar date, not "within the next 24 hours". A task due at 23:00 tonight is `daysUntilDue: 0`, not `1`.

`isOverdue` is computed **server-side** and returned explicitly. The frontend must not re-derive it from a client clock — a client in a different timezone, or a stale clock, would disagree.

### 5.4 Completed Tasks

`DONE` tasks are excluded from upcoming regardless of their due date. A task completed late does not show as overdue.

---

## 6. Code Structure

```text
src/modules/dashboard/
├── dashboard.routes.ts
├── dashboard.controller.ts
├── dashboard.service.ts
├── dashboard.schemas.ts     # Zod: projectId query
├── dueDate.ts               # isOverdue + daysUntilDue, timezone-aware
└── __tests__/

src/modules/tasks/
└── tasks.repository.ts      # reused for the upcoming query
```

`dueDate.ts` is extracted because the Roadmap (Phase 09) needs the same timezone-aware arithmetic and duplicating it invites drift.

---

## 7. Tasks

- [ ] Zod `projectId` query schema
- [ ] `dashboard.service.ts` — `getSummary` via a single `groupBy`
- [ ] `getUpcoming` delegating to the Phase 03 repository with the extra `dueDate IS NOT NULL AND status != 'DONE'` predicate
- [ ] `dueDate.ts` — `isOverdue`, `daysUntilDue`, timezone-aware
- [ ] Default missing status counts to `0`
- [ ] Add `overdue` and `dueToday` to the summary response
- [ ] Default `pageSize` to `10` for `/upcoming`
- [ ] Mount router behind `requireAuth`
- [ ] Confirm the `Task(userId, dueDate)` index serves both the group-by and the due-date ordering

---

## 8. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| Summary totals match the seeded dataset | integration | counts are exact, not approximate |
| `byStatus` sums to `total` | integration | invariant |
| A status with zero rows returns `0`, not `undefined` | integration | |
| Summary is scoped to the caller | integration | two users, counts differ |
| Summary honours `?projectId=` | integration | |
| Summary with another user's `projectId` → 404 | integration | isolation |
| Upcoming excludes `DONE` tasks | integration | completed work is not upcoming |
| Upcoming excludes tasks with no `dueDate` | integration | |
| Upcoming is ordered by `dueDate` ascending | integration | |
| Overdue task → `isOverdue: true`, `daysUntilDue < 0` | integration | |
| Task due later today → `isOverdue: false`, `daysUntilDue: 0` | integration | calendar-day semantics |
| Task due tomorrow → `daysUntilDue: 1` | integration | |
| Completed-but-late task → `isOverdue: false` | integration | §5.4 |
| Upcoming paginates with correct metadata | integration | Phase 03 contract reused |
| Summary and upcoming are consistent with each other | integration | `overdue` count matches the flagged rows |

---

## 9. Acceptance Criteria

1. `GET /api/dashboard/summary` returns total, per-status counts, `overdue`, and `dueToday` for the signed-in user.
2. Per-status counts sum exactly to the total.
3. A status with no tasks reports `0`.
4. `GET /api/dashboard/upcoming` lists only non-`DONE` tasks with a due date, ordered by nearest due date first.
5. Overdue tasks are flagged server-side with `isOverdue` and a negative `daysUntilDue`.
6. A task due later on the current calendar day reports `daysUntilDue: 0`, not `1`.
7. Every value is scoped to the caller — no cross-user leakage, and another user's `projectId` returns 404.
8. Counts come from a single grouped query, verified by query logging.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Timezone drift — client and server disagree on "today" | Compute `isOverdue` / `daysUntilDue` server-side; the client renders the returned flag verbatim |
| Separate queries per status cause inconsistent totals | One `groupBy`, totals derived from it |
| Refetching `now()` between queries skews boundaries | Read `now()` once at the top of the handler and pass it down |
| Counts get slow on large datasets | Index `(userId, status)`; cache with a short TTL if profiling demands it |

---

## 11. Future Phases

Deferred: multi-project rollups, completion-rate trends, activity heatmap, cached aggregate snapshots, custom reporting date ranges.

---

## 12. References

- SRS §7 Dashboard
- SRS §15 Performance
- [Phase 03 — Search, Filter & Pagination](phase-03-backend-search-filter-pagination.md)
- [Phase 06 — Frontend: Dashboard](../README.md#phase-roadmap)