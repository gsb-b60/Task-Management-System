# Phase 08 — Frontend: Projects

> **Source:** [../srs.md](../srs.md) §12 Project Creation, §13.5
> **Priority:** Mandatory (Must) — the `Project` entity is created in Phase 00 and referenced from Phase 02
> **Blocks:** Phase 10 (GitHub repo association)

---

## 1. Objective

Deliver project CRUD so tasks can be grouped, and wire the project selector into the existing task and board views.

---

## 2. Scope

### 2.1 In Scope

- `POST /api/projects` — create
- `GET /api/projects` — list the caller's projects
- `PATCH /api/projects/:id` — update
- `DELETE /api/projects/:id` — delete
- Project Selection screen (SRS §13.5)
- Create / edit project form
- Project switcher in the app shell
- `?projectId=` scoping wired into the task list, dashboard, and board

### 2.2 Out of Scope

- Repository-backed project creation (Phase 10)
- Project members, roles, or invitations
- Project archiving
- Per-project settings pages
- Nested subtasks

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| — | Users can create a project | §12.1 |
| — | Optional description, start date, target date | §12.1 |
| — | Repository-based project creation | §12.2 — deferred to Phase 10 |
| — | Users can access only their own projects | §15 Security |
| FR-10 | `projectId` on a task | §5.1 |

---

## 4. Screens

### 4.1 Project Selection — SRS §13.5

```text
My Projects                                    [ + New Project ]

──────────────────────────────────────────────
▸ Portfolio Website
  Personal site · 12 tasks · 5 done
  Oct 1 – Nov 15

▸ Git Project Manager
  Personal project-management application
  No tasks

──────────────────────────────────────────────

GitHub Repositories                (Phase 10)
────────────────────
owner/repo-1
```

Selecting a project sets `?projectId=` and navigates to its board.

### 4.2 Create / Edit Project

```text
┌──────────────────────────────────────────────┐
│ New Project                                  │
├──────────────────────────────────────────────┤
│ Name        [___________________________]    │
│ Description [                          ]    │
│ Start Date  [ 2026-10-01              ]      │
│ Target Date [ 2026-11-15              ]      │
├──────────────────────────────────────────────┤
│ [ Create ]   [ Cancel ]                      │
└──────────────────────────────────────────────┘
```

Per SRS §12.1, only `name` is required. `targetDate` must not precede `startDate`, matching the task date rule in Phase 02.

### 4.3 Project Switcher

The app shell header carries a project selector. Changing it updates `?projectId=` everywhere — the choice persists across routes and is reflected in the URL, so it survives a refresh and a shared link.

An "All projects" option clears the filter for cross-project task views.

---

## 5. API Surface

All routes behind `requireAuth`.

| Method | Path                    | Description |
| ------ | ----------------------- | ----------- |
| `POST` | `/api/projects`         | Create |
| `GET`  | `/api/projects`         | List the caller's projects, with task counts |
| `GET`  | `/api/projects/:id`     | Read one |
| `PATCH`| `/api/projects/:id`     | Update |
| `DELETE`| `/api/projects/:id`     | Delete |

### 5.1 `GET /api/projects`

**200 OK**

```json
{
  "data": [
    {
      "id": "a13b…",
      "name": "Portfolio Website",
      "description": "Personal site",
      "startDate": "2026-10-01T00:00:00.000Z",
      "targetDate": "2026-11-15T00:00:00.000Z",
      "taskCount": 12,
      "completedTaskCount": 5,
      "createdAt": "2026-10-01T08:00:00.000Z"
    }
  ]
}
```

Task counts come from one `groupBy` on `Task.projectId`, not a per-project query.

### 5.2 `DELETE /api/projects/:id`

**204 No Content.**

Deletion cascades to the project's tasks (`onDelete: CASCADE` from Phase 00). This is destructive and irreversible, so the frontend must confirm explicitly, naming the project and its task count:

```text
Delete "Portfolio Website"?
This permanently deletes 12 tasks. This cannot be undone.

[ Cancel ]  [ Delete ]
```

Consider a soft delete instead if task history must survive. Phase 02 lists soft delete as deferred; revisit if the project delete proves too sharp in practice.

---

## 6. Data Layer

```text
useProjects()
useProject(id)
useCreateProject()
useUpdateProject()
useDeleteProject()
```

### 6.1 Query Keys

```text
['projects']
['project', { id }]
```

### 6.2 Invalidation

| Mutation | Invalidates |
| -------- | ----------- |
| Create / update project | `['projects']` |
| Delete project | `['projects']`, `['tasks']`, `['dashboard']` — the cascade removed tasks |

### 6.3 `projectId` Threading

`projectId` is a filter, not a route parameter. It lives in the URL query string and is passed to the Phase 03 and Phase 04 hooks, which already accept it.

```text
/dashboard?projectId=a13b
/tasks?projectId=a13b&status=TODO
/board?projectId=a13b
```

Threads from the shell selector → URL → hooks → API. No component reads project state from anywhere else, so there is a single source of truth.

---

## 7. Project Layout Additions

```text
frontend/src/
├── api/
│   └── projects.ts
├── hooks/
│   ├── useProjects.ts
│   ├── useProject.ts
│   └── useProjectMutations.ts
├── components/
│   ├── project/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectForm.tsx
│   │   ├── DeleteProjectDialog.tsx
│   │   └── ProjectSwitcher.tsx
├── pages/
│   └── ProjectsPage.tsx
└── lib/
    └── useProjectFilter.ts    # read/write projectId in the URL
```

---

## 8. Tasks

- [ ] `api/projects.ts`
- [ ] Zod schemas for the create and update bodies
- [ ] `projects.service.ts` — CRUD with `userId` scoping, single `groupBy` for counts, cascade delete
- [ ] `projects.mapper.ts`
- [ ] `projects.routes.ts`, controller, mount
- [ ] Confirm `Project.taskId` cascade is in the Phase 00 migration
- [ ] `useProjects`, `useProject`, `useProjectMutations`
- [ ] `ProjectList.tsx` / `ProjectCard.tsx`
- [ ] `ProjectForm.tsx` with the `targetDate >= startDate` rule
- [ ] `DeleteProjectDialog.tsx` naming the project and its task count
- [ ] `ProjectsPage.tsx`
- [ ] `ProjectSwitcher.tsx` in the header
- [ ] `useProjectFilter.ts` — read/write `projectId` in the URL
- [ ] Thread `projectId` into the dashboard, task list, and board queries
- [ ] Persist the last-selected project across navigation

---

## 9. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| Create with only a name → 201 | integration | name alone is sufficient |
| Create with a missing name → 400 | integration | |
| Create with `targetDate < startDate` → 400 | integration | cross-field rule |
| List returns only the caller's projects | integration | two users seeded |
| Task counts match the seeded data | integration | via one `groupBy` |
| Read another user's project → 404 | integration | isolation |
| Update another user's project → 404 | integration | |
| Delete own project → 204, tasks gone | integration | cascade |
| Delete another user's project → 404, nothing removed | integration | isolation |
| Project list renders counts from the API | component | |
| Delete dialog names the project and its task count | component | destructive-action clarity |
| Switcher updates `?projectId=` in the URL | component | |
| Selecting a project scopes the task list | component | |
| Refreshing `/tasks?projectId=x` restores the scope | component | URL as source of truth |
| "All projects" clears the filter | component | |
| Creating a project appears in the list without a manual refresh | component | invalidation |

---

## 10. Acceptance Criteria

1. A user can create a project with only a name, and optionally with a description, start date, and target date.
2. `targetDate` earlier than `startDate` is rejected with a 400 naming the field.
3. Projects can be listed, edited, and deleted, with task counts shown.
4. A user cannot read, update, or delete another user's project.
5. Deleting a project removes its tasks via cascade, after explicit confirmation naming the project and task count.
6. Selecting a project scopes the Dashboard, task list, and Board to it via `?projectId=`.
7. That selection persists across routes and survives a refresh.
8. Project mutations invalidate the project, task, and dashboard caches.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Irreversible cascade delete loses task history | Explicit confirmation naming the task count; consider soft delete later |
| N+1 counts for task totals | Single `groupBy` on `projectId` |
| `projectId` duplicated in component state and URL | URL is the sole source; components read it, never hold a copy |
| Deep-linking to a project the user does not own | Backend returns 404; frontend renders a not-found state, not an empty list |

---

## 12. Future Phases

Deferred: project archiving, project members and roles, per-project task templates, project-level dashboard settings, import/export.

---

## 13. References

- SRS §12 Project Creation
- SRS §13.5 Project Selection
- SRS §15 Security
- [Phase 00 — Backend Foundation](phase-00-backend-foundation.md)
- [Phase 02 — Backend: Task CRUD](phase-02-backend-task-crud.md)