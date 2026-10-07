# Phase 07 — Frontend: Kanban Board

> **Source:** [../srs.md](../srs.md) §7 Kanban Board, §9
> **Priority:** Bonus · FR-21, FR-22

---

## 1. Objective

Deliver the drag-and-drop Kanban board. It reads the same task list as Phase 06 and reuses the existing `PATCH /api/tasks/:id` endpoint for status changes, so this phase adds no new backend surface.

---

## 2. Scope

### 2.1 In Scope

- Board screen with three columns: `TODO`, `IN_PROGRESS`, `DONE`
- Drag a task card between columns
- Optimistic status update with rollback on failure
- Keyboard-accessible alternative to drag-and-drop
- Task card preview with priority and due-date indicators

### 2.2 Out of Scope

- Roadmap (Phase 09)
- GitHub issue cards (Phase 10)
- WIP limits per column
- Multiple assignees or swimlanes
- Card ordering within a column beyond status

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-21 | User can drag tasks between board columns | §9.2 |
| FR-22 | Board persists task status after movement | §9.3 |
| — | Board refresh preserves task status | §9.3 |
| — | Failed updates do not silently lose previous state | §9.3 |
| — | Board supports local tasks and GitHub issues | §9.3 — GitHub cards arrive in Phase 10 |

---

## 4. Screen

```text
┌──────────────┬──────────────────┬──────────────┐
│     TODO     │   IN PROGRESS    │     DONE     │
│      (12)    │       (5)        │      (48)    │
├──────────────┼──────────────────┼──────────────┤
│ #21 Login    │ #18 API Gateway  │ #15 Database │
│  HIGH        │  MEDIUM          │  LOW         │
│  due Oct 15  │  due Oct 10      │              │
├──────────────┼──────────────────┼──────────────┤
│ #22 UI       │ #19 OAuth        │ #16 Docker   │
└──────────────┴──────────────────┴──────────────┘
```

Each column shows its count. Column heights are independent and scroll independently so a long `TODO` column does not push the other two out of view.

---

## 5. Data Layer

The board reuses the Phase 03 query, requesting all three statuses in one paginated fetch.

```text
GET /api/tasks?status=TODO,IN_PROGRESS,DONE&pageSize=100&sortBy=createdAt&sortOrder=asc
```

Grouping happens on the client by `status`. Do not issue three separate requests per column — a single request keeps counts consistent and avoids a partially-loaded board.

### 5.1 Total counts

The column header count reflects the true total, not the number of cards loaded. With `pageSize: 100` and more than 100 tasks in a column, the header shows `totalItems` from `meta` while rendering the first 100 — or the board paginates per column. Decide during implementation and make the behaviour visible in the UI; silently truncating a column is the failure mode to avoid.

### 5.2 Query key

```text
['tasks', { q: '', status: [TODO, IN_PROGRESS, DONE], page: 1, pageSize: 100, … }]
```

---

## 6. Optimistic Update with Rollback

This is the core requirement in SRS §9.3: a failed status update must not silently lose the previous state.

```text
1. User drops card on "DONE"
2. Move the card locally immediately          ← instant feedback
3. PATCH /api/tasks/:id  { status: 'DONE' }
4a. 2xx → keep, invalidate ['tasks'] + ['dashboard']
4b. error → restore the card to its original column
4b. show a toast naming the failure
```

Every optimistic update records its previous value so rollback is exact. If the card was in `IN_PROGRESS` before the drop, it returns to `IN_PROGRESS` — not to wherever the list re-render happens to place it.

Rollback must also invalidate, so a card left in the wrong column visually cannot survive a refetch.

### 6.1 Concurrency

If the user drops a second card while the first PATCH is in flight, each update snapshots its own previous value. The `onMutate` → `onError` → `onSettled` sequence from TanStack Query handles this per mutation, so the two rollbacks do not interfere.

---

## 7. Accessibility

Drag-and-drop is unusable by keyboard or with a pointer-only device, so it cannot be the only way to change status.

- Each card is focusable and exposes a status control — a `<select>` or a small menu with the three statuses.
- Choosing a status there runs the same mutation and the same optimistic path as a drop.
- Drag-and-drop is an enhancement layered on top of a control that already works.

Cards carry accessible names including the title and current status, so a screen reader announces "Fix login redirect, in progress".

---

## 8. Card Design

```text
┌──────────────────────────────────┐
│ #18              [HIGH]          │
│ API Gateway                      │
│                                  │
│ ⚠ due Oct 10        📁 My Repo   │
└──────────────────────────────────┘
```

| Element | Source | Behaviour |
| ------- | ------ | --------- |
| Issue / task number | `id` | Local tasks show a sequential `#n` per project |
| Priority badge | `priority` | Colour-coded, but the label is text — never colour alone |
| Title | `title` | Truncated to two lines |
| Due date | `dueDate`, `isOverdue` from Phase 04 semantics | Overdue rendered with the server's flag |
| Project | `projectId` → name | Hidden when a single project is in view |

Priority and due-date indicators must not rely on colour alone; every colour-coded state also carries a text label or icon for colour-blind users.

---

## 9. Technical Decisions

| Concern | Choice | Why |
| ------- | ------ | --- |
| Drag library | `@dnd-kit/core` | Maintained, keyboard-accessible primitives, TypeScript-first |
| Pointer vs keyboard | `@dnd-kit/sensors` | PointerSensor + KeyboardSensor |
| Cards | `@dnd-kit/sortable` | Needed only if within-column ordering is added later |
| Card component | Plain component | Memoised, since drag re-renders the column |
| Cards as links | Yes | Clicking a card opens the Phase 06 detail route |

Drag state must not fight click state: a pointer movement beyond the drag threshold activates a drag, a release without movement is a click.

---

## 10. Project Layout Additions

```text
frontend/src/
├── pages/
│   └── BoardPage.tsx
├── components/
│   └── board/
│       ├── Board.tsx
│       ├── BoardColumn.tsx
│       ├── TaskCard.tsx
│       └── BoardCardStatusControl.tsx
└── hooks/
    └── useBoard.ts              # query + optimistic status mutation
```

`useBoard` is the single place the optimistic-rollback logic lives, so it is testable without mounting the whole board.

---

## 11. Tasks

- [ ] Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [ ] `useBoard.ts` — query across all three statuses, plus the optimistic status mutation with snapshot and rollback
- [ ] `TaskCard.tsx` — content, priority badge, due-date indicator, memoised
- [ ] `BoardColumn.tsx` — droppable region, count, independent scroll
- [ ] `BoardCardStatusControl.tsx` — keyboard-accessible status change
- [ ] `Board.tsx` — `DndContext`, sensors, drag-overlay
- [ ] `BoardPage.tsx`
- [ ] Resolve total counts vs. the loaded page size; make truncation visible if it applies
- [ ] Rollback toast on failure, naming the task and the reason
- [ ] Invalidate `['tasks']` and `['dashboard']` after a successful move
- [ ] Confirm a board refresh preserves the moved status

---

## 12. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| Three columns render with counts | component | counts from `meta` |
| Tasks group into the correct column by status | component | |
| Drop on a new column issues `PATCH` with that status | component | |
| The card moves immediately, before the response resolves | component | optimistic |
| Successful move keeps the new position | component | |
| Failed move restores the original column | component | rollback to the exact prior status |
| Failed move shows a toast | component | |
| Rollback invalidates the cache so a refetch cannot show the wrong state | component | |
| Two overlapping drops roll back independently | component | no cross-contamination |
| A second drop during an in-flight mutation works | component | |
| Keyboard: a card can be focused and its status changed via the control | component | a11y parity |
| Drag and click do not both fire | component | threshold respected |
| Board refresh preserves the moved status | integration | server persistence |
| Priority indicator carries a text label, not colour alone | component | a11y |
| `DONE` cards are excluded from board queries when filtering | component | |

---

## 13. Acceptance Criteria

1. The board renders three columns with accurate task counts.
2. Dropping a card on a different column moves it immediately and persists the status to the server.
3. If the status update fails, the card returns to its exact previous column and a toast explains why — no silent state loss.
4. A page refresh shows the moved status, proving persistence.
5. A keyboard-only user can change a card's status using the card's status control.
6. Drag-and-drop does not interfere with click-to-open.
7. Priority and overdue states are conveyed by text, not colour alone.
8. Mutation success refreshes the Dashboard counts.
9. `pnpm --filter frontend build` and `pnpm --filter frontend lint` pass.

---

## 14. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Silent state loss on a failed update — the SRS's explicit concern | Optimistic update with snapshot-based rollback, plus cache invalidation and a toast |
| Board diverges from the list view | Shared query keys; the board is a different view over the same cache |
| Drag and click both firing | Use the library's activation constraint / drag threshold |
| Drag-and-drop breaks keyboard and screen-reader use | A real status control on every card; drag is an enhancement only |
| Large columns truncate silently | Surface totals and any truncation in the UI |
| Card re-renders stutter during drag | Memoise cards; keep drag overlay content cheap |

---

## 15. Future Phases

Deferred: within-column ordering, WIP limits, swimlanes by assignee, filtering controls on the board, archived-column collapsing.

---

## 16. References

- SRS §7 Kanban Board
- SRS §9 Main Screens (§9.3 Board)
- SRS §6 Task Status
- [Phase 06 — Frontend: Task List & Dashboard](phase-06-frontend-tasks-dashboard.md)