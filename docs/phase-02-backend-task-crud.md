# Phase 02 — Backend: Task CRUD

> **Source:** [../srs.md](../srs.md) §5, §8
> **Priority:** Mandatory (Must) · FR-06 – FR-11
> **Blocks:** Phase 03, Phase 04, Phase 06 (frontend)

---

## 1. Objective

Deliver full create / read / update / delete for tasks with the status and priority model from SRS §5.1 and §8, scoped strictly to the authenticated user.

---

## 2. Scope

### 2.1 In Scope

- `POST /api/tasks` — create
- `GET /api/tasks/:id` — read one
- `GET /api/tasks` — list the current user's tasks (unpaginated here; Phase 03 adds paging)
- `PATCH /api/tasks/:id` — partial update
- `DELETE /api/tasks/:id` — delete
- Zod validation at the HTTP boundary
- Ownership enforcement on every route
- Status transition rules

### 2.2 Out of Scope

- Search / filter / pagination (Phase 03)
- Dashboard aggregation (Phase 04)
- Kanban board endpoint shape (Phase 05 frontend only — status update already exists here)
- Projects CRUD (tracked as a future phase, §10)
- File attachments

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-06 | User can create a task | §5.2 |
| FR-07 | User can view a task | §5.2 |
| FR-08 | User can edit a task | §5.2 |
| FR-09 | User can delete a task | §5.2 |
| FR-10 | Task has title, description, status, priority, due date | §5.1 |
| FR-11 | Task status is one of `TODO`/`IN_PROGRESS`/`DONE` | §6 |

---

## 4. Task Model

Fixed in Phase 00; restated here as the API contract.

| Attribute    | Type       | Required | Notes                             |
| ------------ | ---------- | -------- | --------------------------------- |
| `title`      | String     | Yes      | Non-empty after trim, max 200     |
| `description` | String    | No       | Optional                          |
| `status`     | Enum       | Yes      | `TODO` \| `IN_PROGRESS` \| `DONE` |
| `priority`   | Enum       | Yes      | `LOW` \| `MEDIUM` \| `HIGH`       |
| `startDate`  | DateTime   | No       | Used by Roadmap                   |
| `dueDate`    | DateTime   | No       | Used by Dashboard and Roadmap     |
| `projectId`  | UUID       | No       | Links the task to a project       |
| `createdAt`  | DateTime   | Yes      | Server-generated                  |
| `updatedAt`  | DateTime   | Yes      | Server-generated                  |

### 4.1 Defaults

`status` defaults to `TODO` and `priority` defaults to `MEDIUM` when omitted on create. Defaulting happens server-side — the client never supplies the initial value.

### 4.2 Validation Rules

| Rule | Failure Response |
| ---- | ---------------- |
| `title` present, non-empty after trim | 400 `VALIDATION_ERROR`, field `title` |
| `title` ≤ 200 chars | 400, field `title` |
| `status` ∈ enum | 400, field `status` |
| `priority` ∈ enum | 400, field `priority` |
| `dueDate >= startDate` when both set | 400, field `dueDate`, message "Due date must not be earlier than start date." |
| `dueDate` / `startDate` are valid ISO-8601 | 400, field-level |

Enforced twice: the `dueDate >= startDate` rule is checked in the Zod schema (for single-field input) **and** in the service layer (for cross-field comparison against existing values on `PATCH`).

### 4.3 Status Transitions

Any status may transition to any other status. There are no gated transitions — Kanban drag-and-drop must never be blocked.

```text
TODO ⇄ IN_PROGRESS ⇄ DONE        (all transitions permitted)
```

GitHub issues keep their own application status independent of the GitHub `open`/`closed` state (SRS §8).

---

## 5. API Surface

All routes below sit behind `requireAuth`.

### 5.1 `POST /api/tasks`

**Request**

```json
{
  "title": "Fix login redirect",
  "description": "Users land on /dashboard after re-auth.",
  "status": "TODO",
  "priority": "HIGH",
  "startDate": "2026-10-01T00:00:00.000Z",
  "dueDate": "2026-10-15T00:00:00.000Z",
  "projectId": "a13b…"
}
```

**201 Created**

```json
{
  "data": {
    "id": "c41f…",
    "title": "Fix login redirect",
    "description": "Users land on /dashboard after re-auth.",
    "status": "TODO",
    "priority": "HIGH",
    "startDate": "2026-10-01T00:00:00.000Z",
    "dueDate": "2026-10-15T00:00:00.000Z",
    "projectId": "a13b…",
    "createdAt": "2026-10-07T09:40:02.114Z",
    "updatedAt": "2026-10-07T09:40:02.114Z"
  }
}
```

**Errors:** `400` validation, `401` unauthenticated, `404` `projectId` not found or not owned.

### 5.2 `GET /api/tasks/:id`

**200 OK** — single task in the `{ data }` envelope.

**Errors:** `401`, `404 NOT_FOUND` — returned for both "does not exist" and "belongs to another user".

### 5.3 `GET /api/tasks`

**200 OK**

```json
{
  "data": [
    { "id": "c41f…", "title": "Fix login redirect", "status": "TODO", "priority": "HIGH", "…": "…" }
  ]
}
```

An unpaginated list in this phase, for the frontend to have something to render. Phase 03 replaces the response with the paginated envelope and adds a `meta` block.

Optional `?projectId=` filter is accepted here so the frontend can scope a task list to a project.

### 5.4 `PATCH /api/tasks/:id`

Accepts any subset of the mutable fields.

**200 OK** — the full updated task.

Behaviour notes:
- Fields absent from the body are left unchanged; `undefined` is never written.
- An explicit `null` clears a nullable field (`description`, `startDate`, `dueDate`, `projectId`).
- `updatedAt` is bumped automatically.
- Cross-field date validation compares incoming values against the stored values for fields not present in the body.

**Errors:** `400`, `401`, `404`.

### 5.5 `DELETE /api/tasks/:id`

**204 No Content** — no body.

**Errors:** `401`, `404`.

---

## 6. Ownership Enforcement

Every route resolves the task with `where: { id, userId: req.user.id }`. A row owned by another user never matches, so the handler returns 404 without an extra existence check.

```text
findUnique({ where: { id } })          ← wrong: leaks existence
findFirst({ where: { id, userId } })    ← correct
```

`projectId` on create and update is validated the same way — a `projectId` belonging to another user is a 404, not a silent no-op.

---

## 7. Code Structure

```text
src/modules/tasks/
├── tasks.routes.ts
├── tasks.controller.ts
├── tasks.service.ts
├── tasks.schemas.ts       # Zod: createBody, updateBody, listQuery
├── tasks.mapper.ts         # Prisma row → response DTO
└── __tests__/
```

The mapper is a deliberate boundary: it guarantees `userId` never leaks into a response body and gives Phase 03 one place to add computed fields.

---

## 8. Tasks

- [ ] `tasks.schemas.ts` — Zod schemas for create, patch, list query
- [ ] `tasks.service.ts` — `create`, `list`, `getById`, `update`, `remove`, each scoped by `userId`
- [ ] Cross-field date validation in the service layer
- [ ] `tasks.mapper.ts` — row → DTO, excluding `userId`
- [ ] `tasks.controller.ts` — status codes, envelope
- [ ] `tasks.routes.ts` — mount behind `requireAuth`
- [ ] Add index on `Task.userId` — confirm present from Phase 00
- [ ] Confirm no route accepts `userId` in the request body
- [ ] Add a seed-script assertion that a task exists for every status and priority

---

## 9. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| Create with only a title → 201, `status = TODO`, `priority = MEDIUM` | integration | defaults applied server-side |
| Create with all fields → 201, values echoed back | integration | |
| Create with an empty or whitespace title → 400 | integration | field-level error |
| Create with a 201-char title → 400 | integration | |
| Create with `dueDate < startDate` → 400 | integration | message names the field |
| Create with `projectId` owned by another user → 404 | integration | isolation |
| Create while unauthenticated → 401 | integration | |
| Read own task → 200 | integration | |
| Read another user's task → 404 | integration | |
| Read nonexistent id → 404 | integration | |
| List returns only the caller's tasks | integration | two users seeded, no cross-contamination |
| Patch a single field → 200, other fields unchanged | integration | no accidental overwrite |
| Patch `description` to `null` → 200, field cleared | integration | |
| Patch `dueDate` earlier than the stored `startDate` → 400 | integration | cross-field rule |
| Patch bumps `updatedAt` | integration | |
| Patch another user's task → 404 | integration | |
| Delete own task → 204, subsequent read → 404 | integration | |
| Delete another user's task → 404, task still exists | integration | isolation |
| Invalid `status` / `priority` values → 400 | integration | enum enforcement |
| Response body never contains `userId` | integration | mapper boundary |

---

## 10. Acceptance Criteria

1. A user can create, read, update, and delete a task, and every change survives a server restart.
2. Omitting `status` on create yields `TODO`; omitting `priority` yields `MEDIUM`.
3. `dueDate` earlier than `startDate` is rejected with a 400 naming the offending field, on both create and patch.
4. Every status and priority enum value is accepted; anything else is a 400.
5. A user cannot read, modify, or delete another user's task — each attempt returns 404 and leaves the data untouched.
6. `userId` never appears in any response body.
7. All tasks in the seeded database appear in `GET /api/tasks` for the demo user.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| `findUnique` by id leaks that another user's task exists | Use `findFirst` with `userId` in the where clause everywhere |
| `PATCH` accidentally nulls omitted fields | Use `undefined` semantics — only write keys present in the body |
| Phase 03 changes the list response shape and breaks the frontend | Phase 03 is the next phase; the frontend is not built until then |
| Date comparisons mishandle timezones | Store and compare as UTC ISO-8601; validate on the server, format on the client |

---

## 12. Future Phases

Deferred: soft delete, task assignment to other users, subtasks, labels, recurring tasks, full-text search index.

---

## 13. References

- SRS §5 Task Management
- SRS §6 Task Status
- [Phase 00 — Backend Foundation](phase-00-backend-foundation.md)
- [Phase 01 — Backend: Accounts](phase-01-backend-auth.md)