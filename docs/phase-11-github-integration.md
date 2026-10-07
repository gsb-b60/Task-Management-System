# Phase 11 — GitHub Integration

> **Source:** [../srs.md](../srs.md) §4, §10, §12.2
> **Priority:** Bonus · FR-23 – FR-26
> **Blocks:** Nothing — optional throughout

---

## 1. Objective

Let a user connect a GitHub repository to a project and surface its issues alongside local tasks on the Board and Roadmap. The GitHub OAuth login flow already landed in Phase 01; this phase adds repository and issue data.

---

## 2. Scope

### 2.1 In Scope

- List the user's GitHub repositories
- Associate a repository with a project
- List the repository's issues
- Import issues as tasks
- Independent application status for imported issues
- Issue metadata display
- GitHub API rate-limit handling

### 2.2 Out of Scope

- Writing back to GitHub — status changes stay inside the application
- Pull requests, Actions, commits, branches, code review
- Issue creation or comments on GitHub
- Repository administration and organisations
- Webhook / event-driven sync

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-24 | View and select a GitHub repository | §10.1 |
| FR-25 | View repository issues and metadata | §10.3 |
| FR-26 | Project can be associated with a GitHub repository | §10.2, §12.2 |
| — | Issue list fields | §10.3 |
| — | Application status independent of GitHub `open`/`closed` | §8 |
| — | Rate limits handled gracefully | §15 Performance |
| — | GitHub API failures must not crash the application | §15 Reliability |
| — | Tokens stay server-side | §15 Security |

---

## 4. Status Independence

The design point that this phase exists to get right, straight from SRS §8:

```text
GitHub:      Issue #42 = OPEN
Application: Issue #42 = IN_PROGRESS
```

A local `Task` row holds the application's own status. It is **not** derived from GitHub's `open`/`closed` state, and moving a card on the Board does **not** close the GitHub issue. Nothing in this phase calls `PATCH /repos/{owner}/{repo}/issues/{number}`.

Treating GitHub's state as the Kanban state is exactly the mistake §8 calls out. The two are separate by design.

---

## 5. Data Model

`GitHubRepository` was created in Phase 00 so this phase needs no breaking migration. It links to exactly one project.

| Field | Source | Notes |
| ----- | ------ | ----- |
| `id` | Local UUID | PK |
| `githubId` | GitHub repository `id` | Unique — the stable external identifier |
| `name` | `name` | |
| `fullName` | `full_name` | `owner/repo` |
| `owner` | `owner.login` | |
| `description` | `description` | Nullable |
| `visibility` | `visibility` | `public` \| `private` |
| `defaultBranch` | `default_branch` | Nullable |
| `url` | `html_url` | |
| `projectId` | Set on association | Unique, FK → `Project.id`, `CASCADE` |

### 5.1 Linking an Imported Issue to a Task

A local task represents an imported issue. Fields:

| `Task` field | Source |
| ------------ | ------ |
| `title` | issue `title` |
| `description` | issue `body` |
| `status` | `TODO` — **not** GitHub's state (§4) |
| `priority` | `MEDIUM` default |
| `userId` | The importing user |
| `projectId` | The associated project |

To distinguish imported issues from local tasks, add:

```text
githubIssueNumber  Int?    unique per (githubRepositoryId, number)
githubRepositoryId UUID?   FK → GitHubRepository.id, SET NULL
```

`githubRepositoryId` nullable and `SET NULL` on delete, so deleting a repository association keeps the tasks as local tasks rather than cascading them away. Deleting a repository must not silently destroy imported work.

Also store `githubState` (`open` / `closed`) for display, separate from `status`.

---

## 6. API Surface

All routes behind `requireAuth`. All GitHub calls are made server-side with the stored token; the token never reaches the browser.

### 6.1 `GET /api/github/repositories`

**200 OK**

```json
{
  "data": [
    {
      "githubId": 1296269,
      "name": "Task-Management-System",
      "fullName": "TechVanguardVn/Task-Management-System",
      "owner": "TechVanguardVn",
      "description": "Mini project brief",
      "visibility": "public",
      "defaultBranch": "main",
      "url": "https://github.com/TechVanguardVn/Task-Management-System"
    }
  ]
}
```

GitHub's API paginates; the endpoint returns the caller's first page of repositories and does not attempt to fetch every repository a user may have.

**Errors:** `401` unauthenticated, `428` if the account has no GitHub token linked (GitHub OAuth was never completed).

### 6.2 `POST /api/projects/:id/github-repository`

```json
{ "githubId": 1296269 }
```

Verifies the repository is accessible with the caller's token, then persists the association.

**Errors:** `400` invalid `githubId`, `401`, `404` project not found or not owned, `403` repository not accessible to the caller.

### 6.3 `DELETE /api/projects/:id/github-repository`

**204 No Content.** Removes the association. Imported tasks become plain local tasks — §5.1.

### 6.4 `GET /api/github/repositories/:githubId/issues`

Passes through:

| Parameter | Type | Default | Notes |
| --------- | ---- | ------- | ----- |
| `state` | `open` \| `closed` \| `all` | `open` | |
| `labels` | String | — | Comma-separated |
| `perPage` | Integer | `30` | Max 100 |

**200 OK**

```json
{
  "data": [
    {
      "number": 24,
      "title": "Fix login redirect",
      "body": "Users land on /dashboard after re-auth.",
      "state": "open",
      "labels": ["bug", "auth"],
      "author": { "login": "dihie", "avatarUrl": "…" },
      "createdAt": "2026-10-02T08:11:00.000Z",
      "updatedAt": "2026-10-05T14:02:00.000Z",
      "url": "https://github.com/…/issues/24"
    }
  ]
}
```

Fields match SRS §10.3: number, title, body, state, labels, author, created, updated.

### 6.5 `POST /api/projects/:id/import-issues`

```json
{ "issueNumbers": [24, 25, 26] }
```

Creates local tasks for the given issues. Idempotent by `(githubRepositoryId, issueNumber)` — re-importing skips issues already imported rather than creating duplicates.

**Errors:** `400` empty or oversized list, `404` project or repository not found, `422` if a requested issue number does not exist in the repository.

---

## 7. Rate Limit Handling

GitHub allows 5,000 authenticated requests per hour per user. Exceeding it returns `403` with `x-ratelimit-remaining: 0`.

| Condition | Handling |
| --------- | -------- |
| `remaining` below a threshold (e.g. 100) | Log a warning; include `x-ratelimit-remaining` in responses |
| `remaining` is 0 | Return `200` with the data already cached, plus a `RATE_LIMITED` notice |
| `403` + `remaining: 0` from GitHub | Translate to a `RATE_LIMITED` / `429` with the reset timestamp |
| `5xx` or timeout from GitHub | Retry twice with exponential backoff, then return `502` |

Rate limiting is **never** allowed to crash the application (SRS §15 Reliability). A GitHub outage degrades the repository view; local tasks, the Board, and the Roadmap keep working.

### 7.1 `BigInt` Serialisation

`githubId` is a `BigInt` in Prisma, which `JSON.stringify` throws on. Add a global serialiser:

```text
BigInt.prototype.toJSON = () => this.toString()
```

Return `githubId` as a string in the API response to avoid precision loss in JavaScript. Document this in the OpenAPI spec — it differs from a typical integer field and a client that assumes a number will misbehave.

---

## 8. Frontend

### 8.1 Repository Picker

In the Phase 08 Project Selection screen, beneath the project list:

```text
GitHub Repositories                              [ ↻ Refresh ]

──────────────────────────────────────────────────
owner/repo-1          public   Updated 2 days ago
owner/repo-2          private  Updated 1 week ago
```

Selecting a repository offers "Link to <project>" or "Import issues". Once linked, the project row shows a repository badge.

### 8.2 Issue List

```text
#24  Fix login redirect      open   [bug][auth]   dihie
#25  Improve mobile layout   open   [ui]          dihie
#26  Add repo filtering      closed            contributor
```

Bulk-select issues and import them.

### 8.3 Board Representation

An imported issue renders as a task card with a `GitHub #n` badge in place of a local sequence number. The Board, Roadmap, and task list need no structural change — imported issues *are* local tasks. §4's status independence means dragging the card moves only the local status.

### 8.4 Query Keys

```text
['github', 'repositories']
['github', 'issues', { githubId, state, labels }]
```

Distinct from task keys so refreshing the issue list does not invalidate the Board cache.

---

## 9. Tasks

- [ ] Migration: `githubIssueNumber` (Int?) and `githubRepositoryId` (UUID?) on `Task`, plus `githubState`
- [ ] Migration: index and unique constraint on `(githubRepositoryId, githubIssueNumber)`
- [ ] `github.client.ts` — typed wrapper with token injection, retry, backoff, rate-limit detection
- [ ] `github.repositories.service.ts` — list, verify accessibility
- [ ] `github.issues.service.ts` — list with `state` / `labels`, fetch by number
- [ ] `github.import.service.ts` — idempotent import into local tasks
- [ ] `bigint` JSON serialiser; `githubId` returned as a string
- [ ] `GET /api/github/repositories`
- [ ] `POST` / `DELETE /api/projects/:id/github-repository`
- [ ] `GET /api/github/repositories/:githubId/issues`
- [ ] `POST /api/projects/:id/import-issues`
- [ ] Verify no endpoint returns `githubAccessToken`
- [ ] OpenAPI annotations, including the string-typed `githubId`
- [ ] `api/github.ts` on the frontend
- [ ] `RepositoryPicker.tsx` and `IssueList.tsx`
- [ ] Wire the picker into the Phase 08 project selection screen
- [ ] `GitHubBadge` on Board cards, Roadmap rows, and task rows
- [ ] Rate-limit and failure surfaces — see §10

---

## 10. Failure States

GitHub integration fails routinely — rate limits, revoked OAuth grants, deleted repositories, network outages. Each needs a clear UI state:

| Condition | UI |
| --------- | -- |
| No GitHub token linked | "Connect GitHub" prompt, hides repository UI |
| Rate limited | Warning banner with the reset time, cached data still shown |
| Repository deleted upstream | Badge on the project reads "Repository unavailable" |
| GitHub unreachable | Non-blocking banner; local features unaffected |
| Issues failed to load | Error state in the issue list only, with retry |
| Import partially succeeded | Report per-issue: imported, skipped, failed |

The governing rule: **no GitHub failure may break local task functionality.** A task is a local record first; GitHub data is an enhancement layered on top.

---

## 11. Tests

| Test | Type | Asserts |
| ---- | ---- | ----------- |
| Repositories list returns GitHub's data | integration | mocked GitHub API |
| Repository list is empty when no token is linked | integration | 428 or empty, no crash |
| Linking a repository verifies access first | integration | mocked |
| Linking a repository the user cannot access → 403 | integration | |
| Linking another user's project → 404 | integration | isolation |
| Deleting the association keeps imported tasks | integration | `SET NULL` behaviour |
| Issue list returns all §10.3 fields | integration | |
| Issue `state` filter works | integration | `open` / `closed` / `all` |
| Imported issue gets `status: TODO` even when closed on GitHub | integration | **§4 status independence — the key test** |
| Import is idempotent — re-import creates no duplicates | integration | |
| Import of a nonexistent issue number → 422 | integration | |
| Rate-limit response → `429` with a reset timestamp | integration | mocked |
| GitHub 500 retried twice, then → `502` | integration | |
| GitHub outage does not affect `/api/tasks` | integration | **§10 guarantee** |
| `githubAccessToken` absent from every response | integration | |
| `githubId` serialises as a string | integration | |
| Board shows a `GitHub #n` badge on imported cards | component | |
| Dragging an imported card does not call the GitHub write API | component | |

---

## 12. Acceptance Criteria

1. A user can see their GitHub repositories and link one to a project.
2. The linked repository's issues display with number, title, body, state, labels, author, and dates.
3. Selected issues import as local tasks, and re-importing creates no duplicates.
4. An imported issue from a **closed** GitHub issue still gets application status `TODO` — GitHub state is never mapped to Kanban state.
5. Moving an imported card on the Board changes only the application status and makes no write call to GitHub.
6. Unlinking a repository keeps imported tasks as local tasks.
7. A GitHub rate limit, outage, or deleted repository produces a clear UI state and no application crash.
8. The GitHub access token never appears in any API response.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| **Mapping GitHub `open`/`closed` to Kanban status** — the exact mistake SRS §8 warns against | Status starts at `TODO` on import regardless of GitHub state; explicit test |
| Rate limits break the feature mid-session | Cache what was fetched; surface the reset time; degrade to cached data |
| `BigInt` serialisation crash | Global serialiser, `githubId` as a string, covered by a test |
| Token leakage through a response | Token excluded from every mapper; asserted in tests |
| Repository deleted upstream leaves a broken project | Association stays but displays "unavailable"; local tasks unaffected |
| Import duplication on retry | Unique constraint on `(githubRepositoryId, githubIssueNumber)` plus an idempotent service |
| A GitHub outage blocks the app | Every GitHub call is wrapped; local routes never depend on it |

---

## 14. Future Phases

Deferred: two-way sync, webhooks, issue creation from the app, PR and Actions surfaces, milestone grouping, label mapping, repository write-back.

---

## 15. References

- SRS §4 GitHub Authentication
- SRS §6 Task Status
- SRS §10 Repository & GitHub Issues
- SRS §12.2 Create Repository-Based Project
- [Phase 01 — Backend: Accounts](phase-01-backend-auth.md)
- [Phase 08 — Projects](phase-08-backend-frontend-projects.md)