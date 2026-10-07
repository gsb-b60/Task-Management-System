# Phase 06 — Frontend: Task List & Dashboard

> **Source:** [../srs.md](../srs.md) §6, §7, §13.3, §13.4
> **Priority:** Mandatory (Must) · FR-12 – FR-20
> **Blocks:** Phase 07 (Board)

---

## 1. Objective

Build the two mandatory screens that consume the Phase 03 and Phase 04 backend: the Dashboard and the searchable, filterable, paginated Task List. Also deliver task detail, since the list needs an edit path.

---

## 2. Scope

### 2.1 In Scope

- Dashboard screen — stats tiles and upcoming-due list
- Task List screen — search box, status filter, priority filter, pagination controls
- Task Detail screen — view, edit, delete
- TanStack Query hooks wrapping the Phase 02 / 03 / 04 endpoints
- Task form with Zod validation
- Query cache keys and invalidation strategy
- Empty, loading, error, and no-search-results states

### 2.2 Out of Scope

- Kanban board (Phase 07)
- Roadmap (Phase 09)
- Project creation UI (Phase 08)
- GitHub integration UI (Phase 10)
- Client-side status/priority derivation — the server is authoritative

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-12 | Search by title | §13.4 |
| FR-13 | Filter by status | §13.4 |
| FR-14 | Filter by priority | §13.4 |
| FR-15 | Paginated task list | §13.4 |
| FR-16 – FR-19 | Dashboard counts | §13.3 |
| FR-20 | Dashboard upcoming list | §13.3 |
| FR-06 – FR-09 | Task create / read / update / delete | §5.2, §13.8 |

---

## 4. Screens

### 4.1 Dashboard — SRS §13.3

```text
Dashboard
──────────────────────────────
Total: 137    Done: 48    Doing: 52    Todo: 37

Overdue: 6    Due today: 3

Upcoming
──────────────────────────────
⚠ #12 Fix login redirect    due tomorrow
⚠ #18 Deploy staging         due today
  #21 Write API docs         due in 5 days
  #24 Refactor auth          due in 9 days

◀ 1  2 ▶
```

Stats tiles render `data.byStatus.TODO`, `.IN_PROGRESS`, `.DONE`, and `data.total`. Absent statuses render `0`, never blank — the server guarantees this, but the UI must not assume a key exists.

`isOverdue` and `daysUntilDue` render exactly as returned. The client must not re-compute them from its own clock — a browser in a different timezone would disagree with the server's calendar-day arithmetic.

Due-date labels come from `daysUntilDue`: `0` → "due today", negative → "overdue by N days", positive → "in N days".

### 4.2 Task List — SRS §13.4

```text
My Tasks

[ Search by title…                         ]
[ Status: All ▾ ] [ Priority: All ▾ ] [ Clear ]

──────────────────────────────────────────────
□ #12  Fix login redirect    HIGH    IN PROGRESS
□ #18  Deploy staging        MEDIUM  TODO
□ #24  Refactor auth         LOW     DONE

◀ 1  2  3 ▶        Showing 1–20 of 137
```

Controls:
- Search input, debounced 300 ms, case-insensitive
- Status filter — multi-select across the three values
- Priority filter — multi-select across the three values
- Clear filters action, shown only when at least one filter is active
- Page controls driven by `meta`, including a result range and total

Filters, search, sort, and page live in the URL query string so the view is shareable and survives a refresh.

### 4.3 Task Detail — SRS §13.8

```text
┌────────────────────────────────────────────┐
│ #12  Fix login redirect       IN PROGRESS │
├────────────────────────────────────────────┤
│ Title        [__________________________] │
│ Description  [                          ] │
│ Status       [ IN PROGRESS          ▾ ]   │
│ Priority     [ HIGH                 ▾ ]   │
│ Start Date   [ 2026-10-01          ]     │
│ Due Date     [ 2026-10-15          ]     │
├────────────────────────────────────────────┤
│ [ Save ]   [ Delete ]   [ Cancel ]         │
└────────────────────────────────────────────┘
```

Delete requires a confirmation dialog naming the task. On success, return to the list with a toast.

---

## 5. Data Layer

### 5.1 Query Hooks

```text
useDashboardSummary(projectId?)
useUpcomingTasks({ projectId?, page, pageSize })
useTasks({ q, status[], priority[], projectId, page, pageSize, sortBy, sortOrder })
useTask(id)
useCreateTask()
useUpdateTask()
useDeleteTask()
```

### 5.2 Cache Keys

Keys are built from exactly the parameters sent to the server, so two different filters never share a cache entry.

```text
['dashboard', 'summary', { projectId }]
['dashboard', 'upcoming', { projectId, page, pageSize }]
['tasks', { q, status, priority, projectId, page, pageSize, sortBy, sortOrder }]
['task', { id }]
```

### 5.3 Invalidation Rules

| Mutation | Invalidates |
| -------- | ----------- |
| Create / update / delete a task | `['tasks']` prefix, `['task', { id }]`, `['dashboard']` prefix |
| Change a task's status or due date | same as above — counts and overdue flags must refresh |

Invalidating by prefix means a mutation on one page correctly updates the Dashboard and any cached list variant.

### 5.4 Pagination State

`page` resets to `1` whenever `q`, `status`, `priority`, or `projectId` changes — otherwise a filter applied on page 7 lands the user on an empty page.

`pageSize` is preserved across filter changes; only the page number resets.

---

## 6. URL State

| Param | Source | Notes |
| ----- | ------ | ----- |
| `q` | Phase 03 | |
| `status` | Phase 03 | comma-separated |
| `priority` | Phase 03 | comma-separated |
| `page` | Phase 03 | |
| `pageSize` | Phase 03 | |
| `sortBy` / `sortOrder` | Phase 03 | |

Filter controls write to `searchParams` via `useSearchParams`; the query hook reads them back. URL is the single source of truth for list state.

---

## 7. States

Every list-bearing screen implements all five:

| State | Treatment |
| ----- | --------- |
| Loading | Skeleton rows matching the real layout — not a spinner over empty space |
| Empty (no tasks at all) | "No tasks yet" + a create call-to-action |
| Empty (filters returned nothing) | "No tasks match your filters" + a clear-filters action |
| Error | Message from `ApiError.message` + a retry button; never a raw stack |
| Success | The list |

Distinguishing "no tasks yet" from "no tasks match" matters — the first invites creation, the second invites clearing filters.

---

## 8. Project Layout Additions

```text
frontend/src/
├── api/
│   ├── tasks.ts
│   └── dashboard.ts
├── hooks/
│   ├── useTasks.ts
│   ├── useTask.ts
│   ├── useDashboard.ts
│   └── useTaskMutations.ts
├── components/
│   ├── task/
│   │   ├── TaskTable.tsx
│   │   ├── TaskRow.tsx
│   │   ├── TaskForm.tsx
│   │   ├── TaskFilters.tsx
│   │   ├── TaskSearch.tsx
│   │   └── DeleteTaskDialog.tsx
│   ├── dashboard/
│   │   ├── StatsTiles.tsx
│   │   └── UpcomingTasks.tsx
│   ├── ui/                 # Button, Input, Select, Dialog, Table,
│   │                       # Skeleton, Toast, EmptyState
│   └── states/
│       ├── LoadingState.tsx
│       ├── ErrorState.tsx
│       └── EmptyState.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── TasksPage.tsx
│   └── TaskDetailPage.tsx
└── lib/
    ├── queryKeys.ts
    └── dates.ts            # format dueDate, render daysUntilDue
```

---

## 9. Tasks

- [ ] `api/tasks.ts` and `api/dashboard.ts`
- [ ] `lib/queryKeys.ts` — centralised key builders
- [ ] `hooks/useTasks.ts`, `useTask.ts`, `useDashboard.ts`, `useTaskMutations.ts`
- [ ] `ui/` primitives: Button, Input, Select, Table, Dialog, Skeleton, Toast, EmptyState
- [ ] `states/` components: Loading, Error, Empty
- [ ] `StatsTiles.tsx` — renders all four counts plus overdue / due today
- [ ] `UpcomingTasks.tsx` — list + pagination
- [ ] `DashboardPage.tsx`
- [ ] `TaskSearch.tsx` — debounced 300 ms
- [ ] `TaskFilters.tsx` — multi-select status and priority, clear action
- [ ] `TaskTable.tsx` / `TaskRow.tsx`
- [ ] `Pagination.tsx` — driven by `meta`
- [ ] `TasksPage.tsx` wired to URL search params
- [ ] `TaskForm.tsx` — Zod validation mirroring the server
- [ ] `DeleteTaskDialog.tsx`
- [ ] `TaskDetailPage.tsx`
- [ ] `lib/dates.ts` — formatting from `daysUntilDue`, never recomputing
- [ ] Reset `page` to 1 on any filter or search change
- [ ] Wire mutations to the invalidation rules in §5.3

---

## 10. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| Dashboard renders all four counts | component | from fixture |
| Absent status key renders `0`, not blank | component | |
| Upcoming shows overdue rows flagged | component | uses server's `isOverdue` |
| `daysUntilDue: 0` renders "due today" | component | |
| Negative `daysUntilDue` renders "overdue by N days" | component | |
| Search debounces — no request before 300 ms | component | fake timers |
| Typing updates the URL query string | component | |
| Status filter sends the correct query param | component | |
| Combined search + status + priority compose in one request | component | |
| Changing a filter resets to page 1 | component | |
| Pagination controls follow `meta` | component | disabled states correct |
| `hasNextPage: false` disables Next | component | |
| Empty state with no tasks offers "create task" | component | |
| Empty state from filters offers "clear filters" | component | |
| Error state shows the API message and a retry control | component | |
| Form blocks submit when the due date precedes the start date | component | |
| Form surfaces server `details[]` on the right fields | component | |
| Delete requires confirmation and names the task | component | |
| Successful mutation refreshes Dashboard counts | component | cache invalidation |
| Direct load of `/tasks?status=TODO&page=2` restores that view | component | URL is the source of truth |

---

## 11. Acceptance Criteria

1. The Dashboard shows total, `DONE`, `IN_PROGRESS`, and `TODO` counts plus `overdue` and `dueToday`.
2. The Dashboard lists upcoming due tasks, nearest first, with overdue tasks visually distinguished.
3. Typing in the search box filters by title after a 300 ms debounce without reloading the page.
4. Status and priority filters work individually, together, and with search.
5. Changing any filter resets to page 1.
6. Pagination controls reflect `meta` and disable correctly at the boundaries.
7. The full list state lives in the URL — a copied link reproduces the same view.
8. Task detail allows creating, editing, and deleting, with server validation errors mapped to the correct fields.
9. After any task mutation, the Dashboard counts and task list reflect the change without a manual refresh.
10. Loading, empty, filtered-empty, and error states are all implemented and distinct.
11. `pnpm --filter frontend build` and `pnpm --filter frontend lint` pass.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Overdue badges computed client-side disagree with the server | Render `isOverdue` verbatim; never derive from a local clock |
| Debounced search firing a request per keystroke | 300 ms debounce plus query-key dedupe |
| Filter change leaving the user stranded on an empty page | Reset `page` to 1 on every filter or search change |
| Cache showing stale counts after a mutation | Prefix-based invalidation on both `['tasks']` and `['dashboard']` |
| Client Zod validation drifting from the server | Treat server `details[]` as authoritative; client rules are for speed only |

---

## 13. Future Phases

Deferred: bulk selection and bulk actions, saved filters, column sorting, inline editing, list density options, keyboard shortcuts.

---

## 14. References

- SRS §5 Task Management
- SRS §6 Search, Filter & Pagination
- SRS §7 Dashboard
- SRS §13.3 Dashboard, §13.4 Task List, §13.8 Task Detail
- [Phase 03 — Backend: Search, Filter & Pagination](phase-03-backend-search-filter-pagination.md)
- [Phase 04 — Backend: Dashboard](phase-04-backend-dashboard.md)