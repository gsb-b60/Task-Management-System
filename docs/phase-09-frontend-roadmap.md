# Phase 09 — Frontend: Roadmap

> **Source:** [../srs.md](../srs.md) §11 Roadmap
> **Priority:** Bonus · FR-27

---

## 1. Objective

Deliver the GitHub-inspired timeline view. It is a different visualisation of the same task data the Board already uses — no new backend endpoints are required.

---

## 2. Scope

### 2.1 In Scope

- Roadmap screen — tasks plotted against time
- Time axis with a configurable window
- Bar per task spanning `startDate` → `dueDate`
- Progress indication from task status
- Milestone / grouping by status or priority
- Tasks without dates handled explicitly

### 2.2 Out of Scope

- Drag-and-drop rescheduling on the timeline
- Gantt dependencies and critical path
- Date-range editing from the roadmap — use task detail
- Resource / capacity planning
- Zoom controls beyond a coarse scale selector

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-27 | User can view the project roadmap | §11 |
| — | Roadmap displays tasks against time | §11 |
| — | Tasks can have start date, due date, status, priority | §11 |
| — | Roadmap serves higher-level planning; Board serves daily progress | §11.1 |

---

## 4. Screen — SRS §13.7

```text
Project Roadmap          [ Sep ][ Oct ][ Nov ][ Dec ]

─────────────────────────────────────────────────────
TODO          ────●──────┐
              Deploy to staging

IN PROGRESS              ├──●────────┐
                         Write API docs        ●

DONE            ┌──●───┐
                Fix login

               Sep      Oct      Nov      Dec
```

Each task is a row: a label on the left, a horizontal bar positioned by date. Bar colour encodes status; the status name is also rendered as text so the meaning does not depend on colour.

---

## 5. Data Source

Reuses the Phase 03 task query with a date filter.

```text
GET /api/tasks?pageSize=100&sortBy=startDate&sortOrder=asc
```

Fetch only tasks relevant to the window:

```text
startDate <= windowEnd  AND  (dueDate >= windowStart OR dueDate IS NULL)
```

The Board already fetches all three statuses. The Roadmap fetches the same underlying rows through a different key so the two caches invalidate independently — a Board drag must not force a full Roadmap re-layout, and vice versa.

### 5.1 Tasks Without Dates

A task with no `startDate` and no `dueDate` has no position on a time axis. Options, and the chosen one:

| Approach | Decision |
| -------- | -------- |
| Hide them | No — silently dropping work is worse than showing it awkwardly |
| Undated column | **Chosen** — an "Undated" lane at the bottom, clearly separated |

The Undated lane shows how many tasks lack scheduling, which is itself useful project information.

A task with only a `dueDate` renders as a milestone diamond at that date. A task with only a `startDate` renders as an open-ended bar to the window edge, marked as having no due date.

---

## 6. Behaviour

### 6.1 Window Selection

| Control | Values | Default |
| ------- | ------ | ------- |
| Scale | Week · Month · Quarter | Month |
| Range | Current · Next 30 / 90 days · Custom | Next 90 days |

Auto-scroll to today on load, marked by a vertical "Today" line.

### 6.2 Progress Representation

```text
TODO          ░░░░░░░░░░  empty bar, dashed outline
IN PROGRESS   ████░░░░░░  bar filled to the status-implied fraction
DONE          ██████████  full bar, solid
```

The fill fraction for `IN_PROGRESS` is a visual convention, not computed progress. Do not present it as a precise percentage — no field in the model supports one.

### 6.3 Today Line

A vertical rule at today's date. Bars for due dates already past it render in the overdue style, using the server's `isOverdue` flag from Phase 04 rather than a client-side clock comparison.

### 6.4 Interaction

| Action | Result |
| ------ | ------ |
| Click a bar | Navigate to the Phase 06 task detail route |
| Hover a bar | Tooltip — title, status, priority, date range |
| Click a column header | Group toggle — by status / priority / assignee / flat |

---

## 7. Layout Calculation

Position and width derive from dates, so the arithmetic has to be correct at boundaries.

```text
left  = (startDate - windowStart) / windowDuration   → percentage
width = (dueDate - startDate)    / windowDuration    → percentage
```

Both clamped to `[0, 1]`, with a `minWidth` so a single-day task stays visible and clickable. A bar narrower than its label needs the label placed outside the bar.

Timezone handling: dates are stored and compared as UTC (established in Phase 02) but *displayed* in the user's local timezone. A task due "2026-10-15" appears on 15 October locally, not shifted by UTC offset. Parse date-only strings as local dates, not `new Date("2026-10-15")` which parses as UTC midnight and can render as the 14th in a negative-offset timezone.

This is the classic off-by-one-day bug in timeline views. Cover it explicitly in tests.

---

## 8. Technical Decisions

| Concern | Choice | Why |
| ------- | ------ | --- |
| Rendering | CSS absolute positioning | No charting dependency for a simple Gantt |
| Layout | Percentage-based left / width | Survives resize without recalculation |
| Library | None | A charting library would be heavier than the requirement |
| Grouping | TanStack Query `select` | Groups at render time, no duplicate cache |

No charting library. This is positioned bars, which is a few dozen lines of CSS — pulling in D3 or Recharts for it would add weight without earning it.

---

## 9. Project Layout Additions

```text
frontend/src/
├── pages/
│   └── RoadmapPage.tsx
├── components/
│   └── roadmap/
│       ├── Roadmap.tsx
│       ├── TimeAxis.tsx
│       ├── RoadmapRow.tsx
│       ├── RoadmapBar.tsx
│       ├── TodayLine.tsx
│       ├── ScaleSelector.tsx
│       ├── RangeSelector.tsx
│       └── UndatedLane.tsx
└── lib/
    ├── roadmapScale.ts      # date → percentage mapping
    └── dateOnly.ts          # timezone-safe date-only parsing
```

---

## 10. Tasks

- [ ] `lib/dateOnly.ts` — parse and format date-only values as local dates
- [ ] `lib/roadmapScale.ts` — window, `left`, `width`, clamping, `minWidth`
- [ ] `TimeAxis.tsx` — month / week / quarter tick marks and labels
- [ ] `TodayLine.tsx`
- [ ] `RoadmapBar.tsx` — bar / milestone / open-ended rendering with status styling
- [ ] `RoadmapRow.tsx` — label plus bar
- [ ] `Roadmap.tsx` — rows, grouping via `select`, windowing
- [ ] `UndatedLane.tsx` — tasks with no dates
- [ ] `ScaleSelector.tsx`, `RangeSelector.tsx`
- [ ] Tooltip on hover with title, status, priority, date range
- [ ] `RoadmapPage.tsx`
- [ ] Query restricted to tasks overlapping the window
- [ ] Auto-scroll to today on load
- [ ] Distinct cache key from the Board's

---

## 11. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| Bar left and width match the date range | unit | `roadmapScale` math |
| A task outside the window is clamped to the edge | unit | no overflow |
| A single-day task renders at `minWidth` | unit | still clickable |
| A task with no dates appears in the Undated lane | component | not hidden |
| A task with only a due date renders as a milestone | component | |
| A task with only a start date renders open-ended | component | |
| `DONE` tasks are styled distinctly and carry a text label | component | not colour alone |
| Clicking a bar navigates to task detail | component | |
| Hover shows the tooltip | component | |
| Group toggle regroups rows | component | |
| Scale change redraws the axis correctly | component | |
| The Today line renders at today's position | component | |
| **A task due 2026-10-15 renders on 15 October** | unit | timezone off-by-one regression guard |
| Overdue styling follows the server's `isOverdue` | component | no client clock |
| A Board status change does not force a full roadmap re-layout | component | separate cache keys |

---

## 12. Acceptance Criteria

1. The roadmap plots tasks against a time axis with configurable scale and range.
2. Each task renders a bar spanning its `startDate` to `dueDate`, positioned proportionally.
3. Status is conveyed by both colour and a text label.
4. Tasks without dates appear in a visible "Undated" lane rather than disappearing.
5. Date-only values render on the correct calendar day regardless of the viewer's timezone.
6. A Today line marks the current date and overdue bars are styled from the server's flag.
7. Clicking a bar opens task detail.
8. Grouping by status, priority, or assignee works.
9. The view loads in under one second with 200 tasks.
10. `pnpm --filter frontend build` and `pnpm --filter frontend lint` pass.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Timezone off-by-one-day — a task renders on the 14th | Parse date-only as local dates; dedicated regression test in §11 |
| Undated tasks silently dropped | Dedicated Undated lane |
| No chart dependency needed but one gets added | Bars are CSS positioning; a charting library is unjustified here |
| Overlapping bars in the same row are unreadable | Rows are per-task in group-by-status mode; collisions are visible and resolved by grouping |
| Resize causes misaligned bars | Percentage-based positioning survives resize without recalculation |
| The Roadmap and Board fight over cache | Distinct cache keys |

---

## 14. Future Phases

Deferred: drag-to-reschedule on the timeline, milestone diamonds with dependencies, critical path, capacity planning, export to image or PDF.

---

## 15. References

- SRS §11 Roadmap
- SRS §13.7 Roadmap
- SRS §6 Task Status
- [Phase 07 — Frontend: Kanban Board](phase-07-frontend-kanban-board.md)