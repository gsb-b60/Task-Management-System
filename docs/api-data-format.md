# API Data Format Specification

> **Source:** [../srs.md](../srs.md) §3–§10, §15, §16, §17, §18 · Phases [00](phase-00-backend-foundation.md)–[14](phase-14-deliverables.md)
> **Priority:** Mandatory · FR-01 – FR-30 · DL-05
> **Feeds:** Phase 10 §7 — OpenAPI generation and the route/spec parity test · Phase 14 §8 — the DL-05 endpoint summary
> **Status:** Contract of record. This document defines the wire format; the phase documents define the behaviour behind it.
> **Implemented:** Phases 00–04 — health, auth, tasks, dashboard — are live on port `5004` and verified against this contract (2026-10-09). The remaining routes are contract-first: they return `404` until their phase lands.

---

## 1. Objective

Pin down the exact JSON that crosses the network boundary for every endpoint: field names, types, nullability, enums, and envelopes.

Phase 10 §7.1 commits to generating OpenAPI from annotations in the route handlers rather than hand-writing YAML, because hand-written specifications drift. This document is the **human-readable statement of that contract** — the thing a reviewer reads to check that the generated spec is actually correct. Where the generated spec and this document disagree, this document wins until one of them is changed on purpose.

**In scope:** request bodies, query parameters, response bodies, error envelopes, and the conventions that govern all of them.

**Out of scope:** business rules, query composition, index strategy, and UI behaviour — those belong to the phase documents. Where a rule matters only to the *shape* of the payload (for example, `isOverdue` being computed server-side) it is noted here and cross-referenced.

---

## 2. Traceability

| Requirement | SRS | Phase | Documented in |
| ---------- | --- | ----- | ------------- |
| REST API, structured errors | §16, §15 Reliability | 00 | [§4](#4-global-conventions), [§4.4](#44-error-envelope) |
| Register / login / logout | §3 | 01 | [§6.2](#62-auth) |
| GitHub OAuth | §4 | 01 | [§6.2](#62-auth) |
| Task CRUD, task model | §5 | 02 | [§6.3](#63-tasks) |
| Search / filter / pagination | §6 | 03 | [§6.3](#63-tasks), [§5.8](#58-paginationmeta) |
| Dashboard statistics, upcoming | §7 | 04 | [§6.4](#64-dashboard) |
| Project creation and CRUD | §12 | 08 | [§6.5](#65-projects) |
| Repository selection, GitHub issues | §10 | 11 | [§6.6](#66-github) |
| Swagger / OpenAPI | §16 | 10, 14 | [§6.7](#67-docs), [§10](#10-mapping-to-openapi) |
| Docker Compose, Kong gateway | §16 | 12 | [§3.1](#31-base-url-varies-by-environment), [§3.2](#32-the-gateway-is-not-the-auth-boundary) |
| Deployment | §16 | 13 | [§3.1](#31-base-url-varies-by-environment) |
| API documentation delivered (DL-05) | §18 | 14 | this document |

---

## 3. Transport

| Property | Value |
| -------- | ----- |
| Base URL | `http://localhost:5004` in development |
| Path prefix | `/api` for all application routes |
| Request content type | `application/json` |
| Response content type | `application/json`, except `204 No Content` which has none |
| Authentication | `gpm_session` cookie (`HttpOnly`, `SameSite=lax`, `Secure` in production, `Path=/`, `Max-Age=604800`) |
| Character encoding | UTF-8 |
| CORS | Frontend origin from `FRONTEND_ORIGIN`, credentials allowed |

There is **no** `Authorization` header and **no** bearer token. The session is an opaque random string delivered only as a cookie (Phase 01 §4.1). A browser client needs `credentials: 'include'`; a CLI or server-side client needs a cookie jar.

Routes that work without a session: `GET /health`, `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` (idempotent by design — §6.2), `GET /api/auth/github`, and `GET /api/auth/github/callback`. Every other route answers `401 UNAUTHENTICATED` without a valid `gpm_session` cookie.

### 3.1 Base URL Varies by Environment

The path contract is fixed, but the origin is not. A client must not hardcode it:

| Environment | API base URL | Source |
| ----------- | ------------ | ------ |
| Local, no Docker | `http://localhost:5004/api` | Phase 12 §7.1 |
| Local, Docker Compose + Kong | `http://localhost:8000/api` | Phase 12 §6.1 |
| Production (Render) | `https://<web-service>.onrender.com/api` | Phase 13 §5.2 |

The frontend reads this from `VITE_API_URL`. Vite inlines `VITE_*` variables at **build time**, not at container start — setting it as a runtime environment variable does nothing, and a Docker image built without the right `--build-arg` will point at `localhost` forever (Phase 12 §5.3). This is the most common cause of "works locally, broken in Docker" for this stack.

Paths, envelopes, and field names are identical across all three. Only the origin changes.

### 3.2 The Gateway Is Not the Auth Boundary

Kong routes and rate-limits, but authentication is enforced in the API, never at the gateway (Phase 12 §7.1). A gateway-only auth check would leave the backend unauthenticated for anyone reaching it directly on `:5004`. Every route works with Kong absent — it is not in the default Compose profile.

A `429` from the gateway and a `429` from the API's own rate limiter are indistinguishable to a client; both carry `RATE_LIMITED`.

### 3.3 Calling the API from the Frontend

The frontend fetch wrapper (`frontend/src/api/client.ts`) is built on these rules:

| Rule | Detail |
| ---- | ------ |
| Base URL | `VITE_API_URL` — `http://localhost:5004/api` in development. Code passes paths relative to it (`/tasks`, `/auth/me`) |
| Credentials | `credentials: 'include'` on every request — the session is an HttpOnly cookie, so a bare `fetch` never sends it |
| Unwrapping | Single resource: return `payload.data`. **Collections: keep both `payload.data` and `payload.meta`** — unwrapping `data` alone discards pagination |
| `204` | No body; treat as success (`logout`, `DELETE /api/tasks/:id`) |
| Errors | Throw on every non-2xx and branch on `error.code`, never on `error.message` |
| `401` | Fires the global sign-out, except where the caller opts out — `/api/auth/me` answers `401` as the normal "not signed in" state |
| Mock switch | `VITE_USE_MOCK_API=false` in `.env.local` switches the app from the mock layer to this API |

Endpoints available **today** (Phases 00–04 implemented; everything else returns `404` until its phase lands):

| Need | Endpoint |
| ---- | -------- |
| Session | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| GitHub sign-in | `GET /api/auth/github` → 302, `GET /api/auth/github/callback` (only when OAuth is configured) |
| Tasks | `GET`/`POST /api/tasks`, `GET`/`PATCH`/`DELETE /api/tasks/:id` |
| Dashboard | `GET /api/dashboard/summary` **and** `GET /api/dashboard/upcoming` — there is no single `GET /api/dashboard` |
| Health probes | `GET /health`, `GET /api/health` — system checks, not application data |

---

## 4. Global Conventions

### 4.1 Envelopes

Four response shapes, and only four.

**Single resource** — a `data` object:

```json
{ "data": { "id": "c41f…", "title": "Fix login redirect" } }
```

**Collection** — a `data` array plus `meta`:

```json
{
  "data": [ /* … */ ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 137, "totalPages": 7,
            "hasNextPage": true, "hasPreviousPage": false }
}
```

**Empty** — `204 No Content`, no body. Used by `POST /api/auth/logout`, `DELETE /api/tasks/:id`, and `DELETE /api/projects/:id`.

**Error** — an `error` object, never a bare status code:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request failed validation.",
    "details": [ { "field": "email", "message": "Must be a valid email address." } ]
  }
}
```

Two endpoints deliberately return a bare object with no `data` wrapper, because they are not resources: `GET /health` and `GET /api/health`. A third, `POST /api/auth/logout`, returns no body at all — it is a `204`. See [§6.1](#61-health).

### 4.2 Dates and Times

Every timestamp is **ISO-8601 in UTC** with millisecond precision and a `Z` suffix:

```text
2026-10-07T09:40:02.114Z
```

| Rule | Detail |
| ---- | ------ |
| Serialisation | Always UTC. The server never emits an offset like `+07:00` |
| Parsing | Any valid ISO-8601 datetime is accepted on input and normalised to UTC |
| Date-only input | `2026-10-15` is accepted and interpreted as `2026-10-15T00:00:00.000Z` |
| Storage | `timestamp(3)` in Postgres via Prisma `DateTime` |
| Calendar arithmetic | "Due today" means the same **local calendar date** in the user's timezone, not a 24-hour window. A task due at 23:00 tonight is `daysUntilDue: 0`, not `1` (Phase 04 §5.3) |

Field naming carries the meaning: `createdAt` / `updatedAt` are instants; `dueDate` / `startDate` / `targetDate` are dates the user thinks of as a calendar day, stored as UTC midnight.

### 4.3 Identifiers and Numbers

| Type | Wire format | Example |
| ---- | ----------- | ------- |
| Local entity ID | UUID v4, lowercase, hyphenated, as a **string** | `"c41f8a1e-5b3d-4c9f-8e2a-1d6b0f3c9a44"` |
| `githubId` | **String**, not a number | `"1296269"` |
| `githubIssueNumber` | Integer — GitHub issue numbers are small and safe | `24` |
| Counts (`taskCount`, `totalItems`) | Integer, never a string | `12` |
| Booleans | `true` / `false`, prefixed `is` / `has` | `isOverdue` |

`githubId` is a `BigInt` in Postgres because GitHub's repository IDs exceed the safe-integer range. `JSON.stringify` throws on a `BigInt`, so the API applies a global serialiser and emits it as a string (Phase 11 §7.1). **A client that coerces `githubId` with `Number()` will silently corrupt it.** This differs from every other identifier in the API and is called out in the OpenAPI spec as `type: string, format: github-id`.

### 4.4 Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request failed validation.",
    "details": [
      { "field": "email",  "message": "Must be a valid email address." },
      { "field": "title",  "message": "Must not be empty." }
    ]
  }
}
```

| Field | Type | Presence | Notes |
| ----- | ---- | -------- | ----- |
| `code` | String | Always | Stable, machine-readable. Switch on this, never on `message` |
| `message` | String | Always | Human-readable summary. Not localised, may be reworded |
| `details` | Array | Validation errors only | One entry per offending field |
| `details[].field` | String | Per entry | Dotted path for nested fields, e.g. `"user.email"`. `null` for whole-body problems such as malformed JSON |
| `details[].message` | String | Per entry | Field-specific explanation |

An internal failure returns `500` with a generic message. **Stack traces, SQL, and driver errors are never serialised** (Phase 00 §8).

### 4.5 Error Codes

| Code | HTTP | Meaning |
| ---- | ---- | ------- |
| `VALIDATION_ERROR` | 400 | Body, query, or path parameter failed schema validation |
| `UNAUTHENTICATED` | 401 | Session missing, expired, revoked, or credentials rejected |
| `FORBIDDEN` | 403 | Authenticated, but not permitted — e.g. a GitHub repository the token cannot access |
| `NOT_FOUND` | 404 | Resource does not exist, **or** belongs to another user |
| `CONFLICT` | 409 | Unique constraint violated — e.g. duplicate email |
| `GITHUB_NOT_LINKED` | 428 | The account has no GitHub OAuth token, so no GitHub call is possible |
| `UNPROCESSABLE` | 422 | Semantically invalid — e.g. an issue number that does not exist in the repository |
| `RATE_LIMITED` | 429 | Too many requests, either local rate limiting or an exhausted GitHub quota |
| `INTERNAL_ERROR` | 500 | Unhandled failure. Details withheld |
| `UPSTREAM_ERROR` | 502 | GitHub returned `5xx` or timed out after two retries |

The first seven rows come from Phase 00 §8. `GITHUB_NOT_LINKED`, `UNPROCESSABLE`, and `UPSTREAM_ERROR` are added by Phase 11 §6–7 — see [§11](#11-open-questions).

### 4.6 Ownership and 404

A resource owned by another user returns `404 NOT_FOUND`, not `403 FORBIDDEN`. Confirming that a row exists is itself a disclosure, and the difference would let a caller enumerate other users' IDs (Phase 01 §4.4, Phase 02 §6).

`404` therefore means *"not found, or not yours"* — the client cannot distinguish them, and should not try.

### 4.7 Fields Never Serialised

Two fields exist in the database and must never appear in any response body, at any endpoint, including error payloads:

| Field | Reason |
| ----- | ------ |
| `userId` | Ownership is derived from the session, never echoed. A client that sends `userId` in a body has it ignored or rejected |
| `githubAccessToken` | Server-side only. Its disclosure compromises the user's GitHub account (Phase 01 §5.6) |

Also withheld: `passwordHash`, `Session.token`, and the `githubRepositoryId` internal foreign key (the public `Repository` object is identified by `githubId`).

Both omissions are asserted in tests (Phase 02 §9, Phase 11 §11). The `tasks.mapper.ts` boundary introduced in Phase 02 §7 exists for exactly this purpose — every row passes through a mapper that cannot emit `userId`.

### 4.8 Absent vs `null`

`PATCH` bodies distinguish three states, and the distinction is load-bearing (Phase 02 §5.4):

| Request | Meaning |
| ------- | ------- |
| Field omitted | Leave unchanged. The stored value is preserved |
| `"description": null` | Explicitly clear the field |
| `"description": "…"` | Set the field |

```jsonc
// Only status changes. description and dueDate are untouched.
{ "status": "IN_PROGRESS" }

// description is cleared to NULL; status is untouched.
{ "description": null }
```

`undefined` is never written. An omitted key must not reach the persistence layer, or a `PATCH` will null every column it did not mention.

`id`, `createdAt`, and `updatedAt` are not patchable. Supplying them is a `400 VALIDATION_ERROR` rather than a silent ignore, so a client bug surfaces immediately.

### 4.9 Enums

Values are `SCREAMING_SNAKE_CASE` strings. There are no numeric enum codes.

| Enum | Values | Used by |
| ---- | ------ | ------- |
| `TaskStatus` | `TODO`, `IN_PROGRESS`, `DONE` | `Task.status`, sort parameter, filters |
| `TaskPriority` | `LOW`, `MEDIUM`, `HIGH` | `Task.priority`, sort parameter, filters |
| `IssueState` | `open`, `closed` | GitHub issue state — **lowercase**, unlike our own enums, because it mirrors GitHub's own wire values |
| `Visibility` | `public`, `private` | `Repository.visibility` |

An unrecognised enum value is a `400 VALIDATION_ERROR` naming the field — never silently coerced to a default. `status=MAYBE` fails rather than falling back to `TODO`.

Task status is **independent** of a GitHub issue's `open`/`closed` state (SRS §8, Phase 11 §4). An imported issue starts at `TODO` regardless of its GitHub state, and dragging it on the Board never writes back to GitHub.

### 4.10 Field Naming

| Pattern | Convention | Examples |
| ------- | ---------- | -------- |
| JSON keys | `camelCase` | `dueDate`, `taskCount`, `hasNextPage` |
| Enum values | `SCREAMING_SNAKE_CASE` | `IN_PROGRESS` |
| Timestamps | `*At` | `createdAt`, `updatedAt` |
| Dates | `*Date` | `dueDate`, `startDate`, `targetDate` |
| Booleans | `is*` / `has*` | `isOverdue`, `hasNextPage` |
| IDs | `*Id` / `*Number` | `projectId`, `githubId`, `githubIssueNumber` |
| List query filter | singular parameter name, array value | `?status=TODO&status=DONE` |

### 4.11 Query Parameter Encoding

| Concern | Rule |
| ------- | ---- |
| Types | All query parameters arrive as strings and are coerced. `page=2` is not JSON, but the API presents it as an integer |
| Arrays | Repeatable **and** comma-separated are both accepted, with identical results (Phase 03 §4) |
| Booleans | `true` / `false` literals only |
| Enums | Exact case-sensitive match |
| Unknown parameters | Ignored. A client sending an unrecognised filter gets the unfiltered list, not a `400` — forward compatibility over strictness |
| Out-of-range values | `pageSize` above 100 is **clamped** to 100, not rejected. `page < 1` **is** rejected with `400` (Phase 03 §11) |

---

## 5. Shared Schemas

### 5.1 `User`

```json
{
  "id": "0f9c8a3e-2b71-4d55-9c18-7a4e0b9d6f12",
  "email": "dev@example.com",
  "displayName": "Dev",
  "createdAt": "2026-10-07T09:12:44.201Z"
}
```

| Field | Type | Null | Notes |
| ----- | ---- | ---- | ----- |
| `id` | UUID string | No | |
| `email` | String | No | Lowercased on write; `citext` so comparison is case-insensitive |
| `displayName` | String | **Yes** | Optional at registration |
| `createdAt` | DateTime | No | |

`updatedAt` is stored but omitted from the user resource — it changes only when the password or a GitHub link changes, and carries no meaning for a client. GitHub profile fields (`githubId`, `githubLogin`) are deliberately absent: they are link state, not profile data, and exposing them invites clients to assume GitHub login is mandatory.

### 5.2 `Task`

The central resource. Returned by every task endpoint and embedded in the Dashboard's upcoming list.

```json
{
  "id": "c41f8a1e-5b3d-4c9f-8e2a-1d6b0f3c9a44",
  "title": "Fix login redirect",
  "description": "Users land on /dashboard after re-auth.",
  "status": "TODO",
  "priority": "HIGH",
  "startDate": "2026-10-01T00:00:00.000Z",
  "dueDate": "2026-10-15T00:00:00.000Z",
  "projectId": "a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70",
  "githubIssueNumber": null,
  "githubState": null,
  "createdAt": "2026-10-07T09:40:02.114Z",
  "updatedAt": "2026-10-07T09:40:02.114Z"
}
```

| Field | Type | Null | Notes |
| ----- | ---- | ---- | ----- |
| `id` | UUID string | No | Server-generated |
| `title` | String | No | Non-empty after trim, max 200 characters |
| `description` | String | **Yes** | Markdown or plain text |
| `status` | `TaskStatus` | No | Defaults to `TODO` on create |
| `priority` | `TaskPriority` | No | Defaults to `MEDIUM` on create |
| `startDate` | DateTime | **Yes** | Feeds the Roadmap |
| `dueDate` | DateTime | **Yes** | Must not precede `startDate` when both are set |
| `projectId` | UUID string | **Yes** | Null for an unassigned task |
| `githubIssueNumber` | Integer | **Yes** | Non-null only on a task imported from a GitHub issue |
| `githubState` | `IssueState` | **Yes** | GitHub's `open`/`closed`, stored and displayed separately from `status` |
| `createdAt` | DateTime | No | Server-generated |
| `updatedAt` | DateTime | No | Bumped on every update |

Two notes on the GitHub fields, both from Phase 11 §5.1:

- `githubIssueNumber` and `githubState` appear together or not at all. Both null means a purely local task.
- **`status` is never derived from `githubState`.** A closed issue imported as a task has `status: "TODO"` and `githubState: "closed"`. Collapsing the two is the specific mistake SRS §8 warns against.

`githubRepositoryId` is intentionally **not** exposed — it is an internal foreign key, and clients already hold `projectId`, which identifies the association.

`projectId` is absent from the SRS §5.1 task table but present in the Phase 00 §6.4 schema, Phase 02 §4, and Phase 08. This document follows the schema.

### 5.3 `TaskSummary`

The Dashboard's upcoming list omits `description`, `startDate`, and the timestamps. A dashboard renders a title, a status chip, and a due date; shipping full task bodies would make the response grow with description length.

```json
{
  "id": "c41f8a1e-5b3d-4c9f-8e2a-1d6b0f3c9a44",
  "title": "Fix login redirect",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "dueDate": "2026-10-08T00:00:00.000Z",
  "isOverdue": true,
  "daysUntilDue": -1
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | UUID string | |
| `title` | String | |
| `status` | `TaskStatus` | |
| `priority` | `TaskPriority` | |
| `dueDate` | DateTime | Never null here — the endpoint filters on `dueDate IS NOT NULL` |
| `isOverdue` | Boolean | **Computed server-side** |
| `daysUntilDue` | Integer | Negative overdue, `0` due today, positive upcoming |

`isOverdue` and `daysUntilDue` are computed on the server and returned as literals. The client must render them verbatim and must **not** re-derive them from its own clock — a browser in a different timezone, or one with a stale clock, would disagree with the data it is displaying (Phase 04 §5.3, §10).

`isOverdue = dueDate < now() AND status != 'DONE'`. A task completed late is not overdue.

### 5.4 `Project`

```json
{
  "id": "a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70",
  "name": "Git Project Manager",
  "description": "Personal project-management application",
  "startDate": "2026-10-01T00:00:00.000Z",
  "targetDate": "2026-11-15T00:00:00.000Z",
  "githubRepositoryId": null,
  "createdAt": "2026-10-01T08:00:00.000Z"
}
```

| Field | Type | Null | Notes |
| ----- | ---- | ---- | ----- |
| `id` | UUID string | No | |
| `name` | String | No | The only required field on create (SRS §12.1) |
| `description` | String | **Yes** | |
| `startDate` | DateTime | **Yes** | |
| `targetDate` | DateTime | **Yes** | Must not precede `startDate` |
| `githubRepositoryId` | String | **Yes** | The linked repository's `githubId`, or null. See the note below |
| `createdAt` | DateTime | No | |

The association is surfaced as a nested `githubRepository` object when one is linked, which is what the Board's repository badge renders from. The flat `githubRepositoryId` shown above is the minimal form, used where the full repository object is not needed:

```jsonc
// Full form — GET /api/projects/:id
{ "id": "a13b…", "name": "Git Project Manager", "githubRepository": { "githubId": "1296269", "fullName": "TechVanguardVn/Task-Management-System", /* … */ } }

// Unlinked — same endpoint
{ "id": "a13b…", "name": "Git Project Manager", "githubRepository": null }
```

`githubRepository` is `null`, never omitted, when unlinked — so a client can branch on presence without a `hasOwnProperty` check. Its shape is the `Repository` schema in [§5.6](#56-repository).

### 5.5 `ProjectListItem`

The project list adds counts so the selection screen renders without an extra request per project (Phase 08 §5.1).

```json
{
  "id": "a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70",
  "name": "Portfolio Website",
  "description": "Personal site",
  "startDate": "2026-10-01T00:00:00.000Z",
  "targetDate": "2026-11-15T00:00:00.000Z",
  "taskCount": 12,
  "completedTaskCount": 5,
  "createdAt": "2026-10-01T08:00:00.000Z"
}
```

Extends `Project` with:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `taskCount` | Integer | Total tasks in the project. `0`, never absent |
| `completedTaskCount` | Integer | Tasks with `status = DONE` |

Both counts come from a single `groupBy` on `Task.projectId`, not a query per project (Phase 08 §5.1).

### 5.6 `Repository`

A GitHub repository the user can see through their token.

```json
{
  "githubId": "1296269",
  "name": "Task-Management-System",
  "fullName": "TechVanguardVn/Task-Management-System",
  "owner": "TechVanguardVn",
  "description": "Mini project brief",
  "visibility": "public",
  "defaultBranch": "main",
  "url": "https://github.com/TechVanguardVn/Task-Management-System"
}
```

| Field | Type | Null | Notes |
| ----- | ---- | ---- | ----- |
| `githubId` | **String** | No | GitHub's repository ID. Stable external identifier — see [§4.3](#43-identifiers-and-numbers) |
| `name` | String | No | Repository name without the owner |
| `fullName` | String | No | `owner/repo` |
| `owner` | String | No | Owner login |
| `description` | String | **Yes** | |
| `visibility` | `Visibility` | No | `public` or `private` |
| `defaultBranch` | String | **Yes** | |
| `url` | String | **Yes** | `html_url` from GitHub |

There is no `id` field. `githubId` *is* the identifier, and adding a second local UUID would give clients two keys for one thing. The `Project` links to this object by `githubId`.

This endpoint returns the first page of GitHub's repository list, not every repository the user has. GitHub paginates and the API does not walk all pages (Phase 11 §6.1) — a user with 400 repositories sees the first 30.

### 5.7 `Issue`

A GitHub issue, passed through with our field names.

```json
{
  "number": 24,
  "title": "Fix login redirect",
  "body": "Users land on /dashboard after re-auth.",
  "state": "open",
  "labels": ["bug", "auth"],
  "author": { "login": "dihie", "avatarUrl": "https://avatars.githubusercontent.com/u/…" },
  "createdAt": "2026-10-02T08:11:00.000Z",
  "updatedAt": "2026-10-05T14:02:00.000Z",
  "url": "https://github.com/TechVanguardVn/Task-Management-System/issues/24"
}
```

| Field | Type | Null | Source | Notes |
| ----- | ---- | ---- | ------ | ----- |
| `number` | Integer | No | `number` | Unique within the repository |
| `title` | String | No | `title` | |
| `body` | String | **Yes** | `body` | GitHub's name for the description |
| `state` | `IssueState` | No | `state` | `open` / `closed` |
| `labels` | String[] | No | `labels` | Empty array, never null |
| `author` | Object | No | `user` | See below |
| `author.login` | String | No | `login` | |
| `author.avatarUrl` | String | **Yes** | `avatar_url` | |
| `createdAt` | DateTime | No | `created_at` | |
| `updatedAt` | DateTime | No | `updated_at` | |
| `url` | String | **Yes** | `html_url` | |

Fields match SRS §10.3: number, title, body, state, labels, author, created, updated. `url` is an addition — the issue list links out to GitHub.

An `Issue` is **not** a `Task`. Reading one tells you what GitHub says; importing it produces a `Task` ([§5.2](#52-task)) with its own independent `status`.

### 5.8 `PaginationMeta`

Every list response carries this. Reused verbatim by `GET /api/tasks`, `GET /api/dashboard/upcoming`, and every future list endpoint (Phase 03 §6).

```json
{
  "page": 1,
  "pageSize": 20,
  "totalItems": 137,
  "totalPages": 7,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `page` | Integer | 1-indexed. Echoes the requested page, even past the end |
| `pageSize` | Integer | Effective page size after clamping. May be lower than requested if the request exceeded 100 |
| `totalItems` | Integer | Count matching the **active filters**, not the whole table |
| `totalPages` | Integer | `ceil(totalItems / pageSize)`. `0` when `totalItems` is `0` |
| `hasNextPage` | Boolean | `page < totalPages` |
| `hasPreviousPage` | Boolean | `page > 1` |

Counts reflect the filters, so two requests with different filters legitimately report different `totalItems`.

An empty result is a `200` with `"data": []` and honest metadata — never a `404`, and never a `200` with stale metadata from a previous request. Requesting page 99 of 7 returns an empty array with `totalPages: 7` (Phase 03 §5.4).

---

## 6. Endpoints

Twenty-seven routes across seven tags. Unless noted, all require `requireAuth`.

| Method | Path | Tag | Success |
| ------ | ---- | --- | ------- |
| `GET` | `/health` | Health | 200 |
| `GET` | `/api/health` | Health | 200 · 503 |
| `POST` | `/api/auth/register` | Auth | 201 |
| `POST` | `/api/auth/login` | Auth | 200 |
| `POST` | `/api/auth/logout` | Auth | 204 |
| `GET` | `/api/auth/me` | Auth | 200 |
| `GET` | `/api/auth/github` | Auth | 302 |
| `GET` | `/api/auth/github/callback` | Auth | 200 · 302 |
| `GET` | `/api/tasks` | Tasks | 200 |
| `POST` | `/api/tasks` | Tasks | 201 |
| `GET` | `/api/tasks/:id` | Tasks | 200 |
| `PATCH` | `/api/tasks/:id` | Tasks | 200 |
| `DELETE` | `/api/tasks/:id` | Tasks | 204 |
| `GET` | `/api/dashboard/summary` | Dashboard | 200 |
| `GET` | `/api/dashboard/upcoming` | Dashboard | 200 |
| `GET` | `/api/projects` | Projects | 200 |
| `POST` | `/api/projects` | Projects | 201 |
| `GET` | `/api/projects/:id` | Projects | 200 |
| `PATCH` | `/api/projects/:id` | Projects | 200 |
| `DELETE` | `/api/projects/:id` | Projects | 204 |
| `GET` | `/api/github/repositories` | GitHub | 200 |
| `GET` | `/api/github/repositories/:githubId/issues` | GitHub | 200 |
| `POST` | `/api/projects/:id/github-repository` | GitHub | 201 |
| `DELETE` | `/api/projects/:id/github-repository` | GitHub | 204 |
| `POST` | `/api/projects/:id/import-issues` | GitHub | 200 |
| `GET` | `/api/openapi.json` | Docs | 200 |
| `GET` | `/api/docs` | Docs | 200 |

### 6.1 Health

Neither endpoint requires a session. Neither returns an envelope — a health probe should be readable by `curl` without unwrapping anything.

#### `GET /health`

Liveness. Confirms the process is up. Does **not** touch the database.

```json
{ "status": "ok", "uptimeSeconds": 42 }
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `status` | String | Always `"ok"` — a failure returns a non-2xx status, not `"down"` |
| `uptimeSeconds` | Integer | Process uptime, truncated to whole seconds |

#### `GET /api/health`

Readiness. Includes database connectivity, so a container orchestrator can hold traffic until the database is reachable.

```json
{
  "status": "ok",
  "database": "connected",
  "uptimeSeconds": 42
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `status` | String | `"ok"` on 200 |
| `database` | String | `"connected"` on 200, `"unavailable"` on 503 |
| `uptimeSeconds` | Integer | Same source as `/health` |

**503 Service Unavailable** — the database is unreachable:

```json
{
  "status": "unavailable",
  "database": "unavailable",
  "uptimeSeconds": 42
}
```

A `503` here is a valid health response, not an error envelope: the endpoint is reporting a condition rather than failing a request. Do not route it through the `error` shape.

### 6.2 Auth

#### `POST /api/auth/register`

Creates an account and logs the user in. No session required to call.

**Request body**

| Field | Type | Required | Constraints |
| ----- | ---- | -------- | ----------- |
| `email` | String | **Yes** | Valid email format, unique, max 254 characters |
| `password` | String | **Yes** | Minimum 8 characters. Stored as a bcrypt hash, 12 salt rounds |
| `displayName` | String | No | Optional free text |

```json
{
  "email": "dev@example.com",
  "password": "sup3rsecret",
  "displayName": "Dev"
}
```

**201 Created** — sets the `gpm_session` cookie and returns the user:

```json
{
  "data": {
    "id": "0f9c8a3e-2b71-4d55-9c18-7a4e0b3d6f12",
    "email": "dev@example.com",
    "displayName": "Dev",
    "createdAt": "2026-10-07T09:12:44.201Z"
  }
}
```

`Set-Cookie: gpm_session=…; HttpOnly; SameSite=lax; Path=/; Max-Age=604800` and `Secure` in production.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Malformed email, password under 8 characters |
| `CONFLICT` | 409 | Email already registered |
| `RATE_LIMITED` | 429 | More than 5 attempts per 15 minutes from this IP |

The `409` names the email as taken. That is acceptable — the caller supplied the email (Phase 01 §5.1).

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Email is already in use.",
    "details": [ { "field": "email", "message": "Email is already in use." } ]
  }
}
```

#### `POST /api/auth/login`

**Request body**

| Field | Type | Required |
| ----- | ---- | -------- |
| `email` | String | **Yes** |
| `password` | String | **Yes** |

```json
{ "email": "dev@example.com", "password": "sup3rsecret" }
```

**200 OK** — identical body and cookie to `register`. The two endpoints return the same shape by design, so a client can share one post-login handler.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Missing email or password |
| `UNAUTHENTICATED` | 401 | Unknown email **or** wrong password — indistinguishable |
| `RATE_LIMITED` | 429 | More than 10 attempts per 15 minutes |

The `401` is byte-identical for both failure modes, and the server takes the same time on both — a dummy bcrypt comparison runs on the miss path. A client cannot, and an attacker cannot, distinguish "no such account" from "wrong password":

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Invalid email or password.",
    "details": []
  }
}
```

#### `POST /api/auth/logout`

**204 No Content** — no body. Deletes the `Session` row and clears the cookie.

Idempotent: calling it with no session, an expired session, or an already-invalid token still returns `204`. A logout that can fail is a logout UI that has to handle the failure.

`Set-Cookie: gpm_session=; HttpOnly; Max-Age=0`

#### `GET /api/auth/me`

Returns the signed-in user. The session-check endpoint every protected screen calls on load.

**200 OK**

```json
{
  "data": {
    "id": "0f9c8a3e-2b71-4d55-9c18-7a4e0b3d6f12",
    "email": "dev@example.com",
    "displayName": "Dev"
  }
}
```

`createdAt` is omitted here — the session screen has no use for it.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | Session missing, expired, or revoked |

An expired session row is deleted opportunistically during this lookup (Phase 01 §6.1), so a `401` here also cleans up.

There is no endpoint that accepts a user ID for lookup. `GET /api/auth/me` is the only way to read a profile, which is what makes ID-guessing pointless (Phase 01 §10.6).

#### `GET /api/auth/github`

**302 Found** → GitHub's OAuth authorize URL. The client follows the redirect; the browser lands on GitHub's consent screen.

No body, no session required.

#### `GET /api/auth/github/callback?code=…`

GitHub redirects here after the user consents.

**Query parameters**

| Parameter | Type | Required | Notes |
| --------- | ---- | -------- | ----- |
| `code` | String | **Yes** | GitHub's authorization code. Exchanged server-side for an access token |

**200 OK** — GitHub returns an HTML form post in some configurations. When the callback is called directly — by curl, or by a test — the API returns the user with a `Set-Cookie` and the client navigates onward itself:

```json
{
  "data": {
    "id": "0f9c8a3e-2b71-4d55-9c18-7a4e0b3d6f12",
    "email": "dev@example.com",
    "displayName": "dihie",
    "createdAt": "2026-10-07T09:12:44.201Z"
  }
}
```

Three linking outcomes, all producing this same response (Phase 01 §5.6):

| GitHub account state | Outcome |
| -------------------- | ------- |
| `githubId` already linked | Log in, issue a session |
| No `githubId` match, but the email matches an existing user | Link GitHub to that user — no second account is created |
| No match at all | Create a user with a null `passwordHash` |

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | GitHub returned an unusable profile |
| `UNAUTHENTICATED` | 401 | Missing or invalid `code` |

The `redirect_uri` sent to GitHub is fixed server-side and allowlisted. It is never taken from request input, so this endpoint cannot be used as an open redirect.

`githubAccessToken` is written to the database and never returned.

### 6.3 Tasks

#### `GET /api/tasks`

The list endpoint. Search, filter, sort, and paginate in one call.

**Query parameters**

| Parameter | Type | Default | Constraints | Notes |
| --------- | ---- | ------- | ----------- | ----- |
| `q` | String | — | ≤ 200 characters | Case-insensitive partial match on `title` |
| `status` | `TaskStatus[]` | — | Repeatable or comma-separated | Filter by one or more statuses |
| `priority` | `TaskPriority[]` | — | Repeatable or comma-separated | Filter by one or more priorities |
| `projectId` | UUID | — | Must be owned by the caller | Scopes to one project |
| `page` | Integer | `1` | ≥ 1 | 1-indexed. `0` or negative is a `400` |
| `pageSize` | Integer | `20` | 1–100 | Values above 100 are clamped, not rejected |
| `sortBy` | String | `dueDate` | `dueDate`, `createdAt`, `updatedAt`, `priority`, `status`, `title` | |
| `sortOrder` | String | `asc` | `asc`, `desc` | |

Both array forms are accepted and produce identical results:

```text
/api/tasks?status=TODO&status=DONE
/api/tasks?status=TODO,DONE
```

Filters compose as an **intersection**, never a union — `?status=TODO&priority=HIGH` returns high-priority TODO tasks:

```text
WHERE userId = <session>          ← never from request input
  AND title ILIKE '%q%'           ← q
  AND status  IN (…)              ← status
  AND priority IN (…)             ← priority
  AND projectId = …
ORDER BY <sortBy> <sortOrder>, id ASC
LIMIT pageSize OFFSET (page - 1) * pageSize
```

The `id ASC` tiebreaker is always appended. Without it, two tasks sharing a sort key can swap between pages on refresh, and one appears twice while another vanishes.

**200 OK**

```json
{
  "data": [
    {
      "id": "c41f8a1e-5b3d-4c9f-8e2a-1d6b0f3c9a44",
      "title": "Fix login redirect",
      "description": "Users land on /dashboard after re-auth.",
      "status": "TODO",
      "priority": "HIGH",
      "startDate": "2026-10-01T00:00:00.000Z",
      "dueDate": "2026-10-15T00:00:00.000Z",
      "projectId": "a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70",
      "githubIssueNumber": null,
      "githubState": null,
      "createdAt": "2026-10-07T09:40:02.114Z",
      "updatedAt": "2026-10-07T09:40:02.114Z"
    }
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

Rows are full `Task` objects. Only `/api/dashboard/upcoming` uses the reduced `TaskSummary`.

**Sorting nulls.** `dueDate` and `startDate` are nullable, and a task with no deadline must not dominate the top of an ascending list:

| `sortOrder` | Null placement |
| ----------- | ------------- |
| `asc` | `NULLS LAST` — undated tasks at the end |
| `desc` | `NULLS FIRST` — undated tasks at the top |

**Empty results** — `200` with `"data": []`, `totalItems: 0`, `totalPages: 0`. Not a `404`.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Non-numeric `page`, out-of-range `page`, unknown enum in `status` or `priority`, unparseable `sortBy` |
| `NOT_FOUND` | 404 | `projectId` exists but is not owned by the caller |

#### `POST /api/tasks`

**Request body**

| Field | Type | Required | Default | Constraints |
| ----- | ---- | -------- | ------- | ----------- |
| `title` | String | **Yes** | — | Non-empty after trim, ≤ 200 characters |
| `description` | String | No | `null` | Markdown or plain text |
| `status` | `TaskStatus` | No | `TODO` | |
| `priority` | `TaskPriority` | No | `MEDIUM` | |
| `startDate` | DateTime | No | `null` | |
| `dueDate` | DateTime | No | `null` | Must not precede `startDate` when both are set |
| `projectId` | UUID | No | `null` | Must be owned by the caller |

Defaults are applied **server-side**. A client never supplies the initial status or priority — it would be trusting a value the server already knows.

```json
{
  "title": "Fix login redirect",
  "description": "Users land on /dashboard after re-auth.",
  "status": "TODO",
  "priority": "HIGH",
  "startDate": "2026-10-01T00:00:00.000Z",
  "dueDate": "2026-10-15T00:00:00.000Z",
  "projectId": "a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70"
}
```

`{"title": "Write API docs"}` is a valid request. It yields `status: "TODO"`, `priority: "MEDIUM"`, and nulls everywhere else.

**201 Created** — the full task ([§5.2](#52-task)).

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Empty title, title over 200 characters, bad enum, unparseable date, `dueDate` before `startDate` |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | `projectId` not found, or not owned by the caller |

A `projectId` belonging to another user is a `404`, not a silent no-op that quietly creates an orphan task.

Cross-field date violation names the offending field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request failed validation.",
    "details": [
      { "field": "dueDate", "message": "Due date must not be earlier than start date." }
    ]
  }
}
```

#### `GET /api/tasks/:id`

**Path parameters**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| `id` | UUID | The task's identifier |

**200 OK** — `{ "data": { …Task } }`.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | No such task, **or** owned by another user |

The 404 is deliberately ambiguous — see [§4.6](#46-ownership-and-404).

#### `PATCH /api/tasks/:id`

Partial update. Accepts any subset of the mutable fields.

**Request body** — every field optional; identical types and constraints to `POST`.

```json
{ "status": "IN_PROGRESS" }
```

Absent versus `null` follows [§4.8](#48-absent-vs-null):

```jsonc
{ "status": "DONE", "description": null }   // status set, description cleared, dates untouched
```

`id`, `createdAt`, and `updatedAt` are not patchable — supplying them is a `400`.

**200 OK** — the full updated task. `updatedAt` is bumped; omitted fields are preserved byte-for-byte.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Bad enum, unparseable date, `dueDate` before the **stored** `startDate`, immutable field supplied |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | No such task, or not owned |

The date rule compares incoming values against **stored** values for fields the body omits. Patching only `dueDate` on a task whose `startDate` is already stored must still be validated against that stored `startDate` — checking only the two values present in the request body would let a client smuggle in an invalid pair (Phase 02 §4.2).

Any status may move to any other status. There are no gated transitions, because drag-and-drop must never be refused:

```text
TODO ⇄ IN_PROGRESS ⇄ DONE        (all transitions permitted)
```

#### `DELETE /api/tasks/:id`

**204 No Content** — no body.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | No such task, or not owned — and the task is left untouched |

### 6.4 Dashboard

#### `GET /api/dashboard/summary`

Statistics for the signed-in user.

**Query parameters**

| Parameter | Type | Required | Notes |
| --------- | ---- | -------- | ----- |
| `projectId` | UUID | No | Scope to one project. Must be owned by the caller |

**200 OK**

```json
{
  "data": {
    "total": 137,
    "byStatus": { "TODO": 37, "IN_PROGRESS": 52, "DONE": 48 },
    "overdue": 6,
    "dueToday": 3
  }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `total` | Integer | Sum of `byStatus` |
| `byStatus` | Object | All three statuses always present |
| `byStatus.TODO` | Integer | |
| `byStatus.IN_PROGRESS` | Integer | |
| `byStatus.DONE` | Integer | |
| `overdue` | Integer | `dueDate < now()` and `status != DONE` |
| `dueToday` | Integer | `dueDate` falls on today's local calendar date |

A status with no tasks reports `0`, never `undefined` or a missing key — the client does not have to guard before rendering.

```json
{ "data": { "total": 0, "byStatus": { "TODO": 0, "IN_PROGRESS": 0, "DONE": 0 }, "overdue": 0, "dueToday": 0 } }
```

All four counts derive from a **single** `groupBy` on `status`, not four queries. Four queries can observe four different moments in time and produce totals that do not add up (Phase 04 §10).

No `meta` block — this is not a list.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | `projectId` not owned by the caller |

#### `GET /api/dashboard/upcoming`

Tasks approaching or past their due date.

**Query parameters** — the full Phase 03 contract, with a different default:

| Parameter | Type | Default | Notes |
| --------- | ---- | ------- | ----- |
| `q` | String | — | Partial title match |
| `status` | `TaskStatus[]` | — | Applied on top of the default predicate |
| `priority` | `TaskPriority[]` | — | |
| `page` | Integer | `1` | |
| `pageSize` | Integer | **`10`** | A dashboard shows a short list, not 20 rows |
| `sortBy` | String | `dueDate` | |
| `sortOrder` | String | `asc` | |

**Implicit predicate**, applied before anything the caller sends:

```text
dueDate IS NOT NULL AND status != 'DONE'
```

Completed work is not upcoming, and a task completed late does not appear as overdue. Supplying `status=DONE` explicitly intersects with this predicate and yields an empty list — the endpoint cannot be used to list completed tasks.

**200 OK** — `TaskSummary` rows ([§5.3](#53-tasksummary)) plus `meta`.

```json
{
  "data": [
    {
      "id": "c41f8a1e-5b3d-4c9f-8e2a-1d6b0f3c9a44",
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

`isOverdue` and `daysUntilDue` are rendered exactly as returned. The client does not compare timestamps.

`daysUntilDue` is integer calendar-day distance in the user's timezone:

| Value | Meaning |
| ----- | ------- |
| Negative | Overdue |
| `0` | Due today — including later tonight |
| Positive | Days remaining |

`overdue` in `summary` and `isOverdue: true` in `upcoming` must agree. They read the same predicate, and a mismatch means one of them is wrong (Phase 04 §8).

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Bad `page`, unknown enum, unparseable `sortBy` |
| `UNAUTHENTICATED` | 401 | No session |

### 6.5 Projects

#### `GET /api/projects`

**200 OK** — `ProjectListItem` rows ([§5.5](#55-projectlistitem)).

```json
{
  "data": [
    {
      "id": "a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70",
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

No pagination. A user has a handful of projects, not thousands — a `meta` block on a list that never pages is noise.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |

#### `POST /api/projects`

**Request body**

| Field | Type | Required | Constraints |
| ----- | ---- | -------- | ----------- |
| `name` | String | **Yes** | Non-empty after trim |
| `description` | String | No | |
| `startDate` | DateTime | No | |
| `targetDate` | DateTime | No | Must not precede `startDate` when both are set |

Only `name` is required (SRS §12.1):

```json
{ "name": "Git Project Manager" }
```

**201 Created** — the full `Project` ([§5.4](#54-project)).

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Missing or empty `name`, `targetDate` before `startDate` |
| `UNAUTHENTICATED` | 401 | No session |

#### `GET /api/projects/:id`

**200 OK** — `{ "data": { …Project, "githubRepository": Repository | null } }`.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | No such project, or not owned |

#### `PATCH /api/projects/:id`

Partial update. Any subset of `name`, `description`, `startDate`, `targetDate`. Absent versus `null` per [§4.8](#48-absent-vs-null).

**200 OK** — the full updated `Project`.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Empty `name`, `targetDate` before the stored `startDate`, immutable field supplied |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | No such project, or not owned |

#### `DELETE /api/projects/:id`

**204 No Content**.

Deletes the project **and all of its tasks**, via `onDelete: CASCADE` (Phase 00 §6.6). Irreversible.

The `204` does not report how many tasks were destroyed. The client is expected to have fetched `taskCount` and shown a confirmation naming the project and its task count *before* calling this (Phase 08 §5.2).

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | No such project, or not owned — nothing is deleted |

### 6.6 GitHub

All GitHub calls are made server-side using the stored `githubAccessToken`. The token never reaches the browser, and none of these endpoints return it.

#### `GET /api/github/repositories`

The caller's GitHub repositories.

**200 OK**

```json
{
  "data": [
    {
      "githubId": "1296269",
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

`githubId` is a **string**. Do not parse it as a number.

Returns the first page of GitHub's listing. A user with many repositories sees a subset — this is deliberate, since walking every page on every request would burn the hourly quota (Phase 11 §6.1).

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `GITHUB_NOT_LINKED` | 428 | The account has no GitHub token — OAuth was never completed |
| `RATE_LIMITED` | 429 | GitHub's hourly quota is exhausted |
| `UPSTREAM_ERROR` | 502 | GitHub returned `5xx` or timed out after two retries |

A GitHub failure degrades the repository picker and nothing else. The Board, Roadmap, and local task endpoints must keep working — a GitHub outage must never take down local task management (Phase 11 §10).

#### `GET /api/github/repositories/:githubId/issues`

Issues in a repository.

**Path parameters**

| Parameter | Type | Notes |
| --------- | ---- | ----- |
| `githubId` | String | The repository's GitHub ID. **String, not a number** |

**Query parameters**

| Parameter | Type | Default | Constraints | Notes |
| --------- | ---- | ------- | ----------- | ----- |
| `state` | `IssueState` \| `all` | `open` | `open`, `closed`, `all` | |
| `labels` | String | — | Comma-separated | e.g. `?labels=bug,auth` |
| `perPage` | Integer | `30` | Max 100 | Clamped at 100 |

**200 OK** — `Issue` rows ([§5.7](#57-issue)).

```json
{
  "data": [
    {
      "number": 24,
      "title": "Fix login redirect",
      "body": "Users land on /dashboard after re-auth.",
      "state": "open",
      "labels": ["bug", "auth"],
      "author": { "login": "dihie", "avatarUrl": "https://avatars.githubusercontent.com/u/1" },
      "createdAt": "2026-10-02T08:11:00.000Z",
      "updatedAt": "2026-10-05T14:02:00.000Z",
      "url": "https://github.com/TechVanguardVn/Task-Management-System/issues/24"
    }
  ]
}
```

An `Issue` is not a `Task` and has no `status` field. GitHub's `open`/`closed` state is the only state here, and it is not the Kanban state.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `FORBIDDEN` | 403 | The token cannot access this repository |
| `NOT_FOUND` | 404 | No such repository for this account |
| `RATE_LIMITED` | 429 | GitHub quota exhausted |
| `UPSTREAM_ERROR` | 502 | GitHub returned `5xx` or timed out |

#### `POST /api/projects/:id/github-repository`

Associates a GitHub repository with a project.

**Request body**

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `githubId` | String | **Yes** | The repository's GitHub ID, as a string |

```json
{ "githubId": "1296269" }
```

Access is verified with the caller's token *before* the association is persisted — a project must not end up pointing at a repository the user cannot read.

**201 Created** — the updated `Project` with `githubRepository` populated.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | `githubId` absent or not a string |
| `UNAUTHENTICATED` | 401 | No session |
| `FORBIDDEN` | 403 | The repository is not accessible to the caller |
| `NOT_FOUND` | 404 | Project not found or not owned; repository not found |

#### `DELETE /api/projects/:id/github-repository`

**204 No Content** — removes the association.

**Imported tasks survive.** `Task.githubRepositoryId` is nullable with `ON DELETE SET NULL`, so a task created from an issue reverts to a plain local task with its `githubIssueNumber` and `githubState` preserved for display. Deleting a repository must never destroy imported work (Phase 11 §5.1).

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | Project not found, not owned, or has no association |

#### `POST /api/projects/:id/import-issues`

Creates local tasks from GitHub issues.

**Request body**

| Field | Type | Required | Constraints |
| ----- | ---- | -------- | ----------- |
| `issueNumbers` | Integer[] | **Yes** | Non-empty. See the cap below |

```json
{ "issueNumbers": [24, 25, 26] }
```

**200 OK** — the created tasks, plus a per-issue outcome so a partial failure is legible:

```json
{
  "data": {
    "created": [
      {
        "id": "7e2d1a90-3f45-4b8c-9a17-5c0e8d4f2b31",
        "title": "Fix login redirect",
        "status": "TODO",
        "priority": "MEDIUM",
        "githubIssueNumber": 24,
        "githubState": "closed"
      }
    ],
    "skipped": [26],
    "failed": [{ "issueNumber": 99, "code": "NOT_FOUND", "message": "Issue 99 does not exist in this repository." }]
  }
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `created` | Task[] | Newly created tasks |
| `skipped` | Integer[] | Issue numbers already imported. Idempotent re-import |
| `failed` | Object[] | `{ issueNumber, code, message }` per issue that could not be imported |

Idempotent by `(githubRepositoryId, issueNumber)`: re-importing skips rather than duplicating (Phase 11 §6.5). A unique constraint backs the service-level check, so a concurrent double-submit cannot create duplicates.

**Every imported task gets `status: "TODO"` and `priority: "MEDIUM"`** — regardless of the issue's GitHub state. An import of a **closed** issue yields `status: "TODO"` with `githubState: "closed"`. This is the single most important rule in this document, and it is exactly what SRS §8 warns against getting wrong.

`400 VALIDATION_ERROR` — `issueNumbers` absent or empty. The list is capped at 100 issues per request; a larger list is a `400`, not a silent truncation.

| Error | HTTP | Condition |
| ----- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Missing, empty, or oversized `issueNumbers` |
| `UNAUTHENTICATED` | 401 | No session |
| `NOT_FOUND` | 404 | Project not found or not owned; project has no linked repository |
| `UNPROCESSABLE` | 422 | A requested issue number does not exist in the repository |
| `FORBIDDEN` | 403 | The repository is not accessible to the caller |

Per-issue failures appear in `failed` with a `200`, because a partial import is a real outcome the client must render. A `422` means the request as a whole was unusable.

### 6.7 Docs

Two routes that serve this contract. Neither requires a session, and neither is part of the application API — they are the API's own documentation. They are listed here because they are registered Express routes, so the Phase 10 §7.3 parity test asserts they appear in the specification.

#### `GET /api/openapi.json`

**200 OK** — `application/json`, the generated OpenAPI 3.0 document covering all twenty-five application routes above.

#### `GET /api/docs`

**200 OK** — `text/html`, the Swagger UI interface, served from the specification above.

Both are static in the sense that they take no parameters and mutate nothing, but both are regenerated at build time from the route handlers, so they track the code rather than a hand-maintained file (Phase 10 §7.1).

---

## 7. Worked Example

A complete session against a running backend. Every payload below is a real response shape from this document.

```bash
# 1. Register — logs in, writes the session cookie
curl -i -c cookies.txt -X POST http://localhost:5004/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"sup3rsecret","displayName":"Dev"}'
```

```http
HTTP/1.1 201 Created
Set-Cookie: gpm_session=8fA2…; HttpOnly; SameSite=lax; Path=/; Max-Age=604800

{"data":{"id":"0f9c8a3e-2b71-4d55-9c18-7a4e0b3d6f12","email":"dev@example.com",
  "displayName":"Dev","createdAt":"2026-10-07T09:12:44.201Z"}}
```

```bash
# 2. Create a project — name is the only required field
curl -b cookies.txt -X POST http://localhost:5004/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Git Project Manager","startDate":"2026-10-01"}'
```

```json
{"data":{"id":"a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70",
  "name":"Git Project Manager","description":null,
  "startDate":"2026-10-01T00:00:00.000Z","targetDate":null,
  "githubRepository":null,"createdAt":"2026-10-07T09:44:10.002Z"}}
```

```bash
# 3. Create a task — status and priority defaulted server-side
curl -b cookies.txt -X POST http://localhost:5004/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Fix login redirect","dueDate":"2026-10-15",
       "projectId":"a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70"}'
```

```json
{"data":{"id":"c41f8a1e-5b3d-4c9f-8e2a-1d6b0f3c9a44",
  "title":"Fix login redirect","description":null,
  "status":"TODO","priority":"MEDIUM",
  "startDate":null,"dueDate":"2026-10-15T00:00:00.000Z",
  "projectId":"a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70",
  "githubIssueNumber":null,"githubState":null,
  "createdAt":"2026-10-07T09:45:31.870Z","updatedAt":"2026-10-07T09:45:31.870Z"}}
```

```bash
# 4. Move it to DONE — the drag-and-drop write. Absent fields survive.
curl -b cookies.txt -X PATCH http://localhost:5004/api/tasks/c41f8a1e-5b3d-4c9f-8e2a-1d6b0f3c9a44 \
  -H 'Content-Type: application/json' \
  -d '{"status":"IN_PROGRESS"}'
```

```bash
# 5. Search, filter, paginate. Both array forms are equivalent.
curl -b cookies.txt \
  'http://localhost:5004/api/tasks?q=login&status=TODO,IN_PROGRESS&priority=HIGH&sortBy=dueDate&sortOrder=asc&page=1&pageSize=10'
```

```json
{
  "data": [ { "id": "c41f8a1e-…", "title": "Fix login redirect", "status": "IN_PROGRESS",
              "priority": "HIGH", "dueDate": "2026-10-15T00:00:00.000Z", "…": "…" } ],
  "meta": { "page": 1, "pageSize": 10, "totalItems": 3, "totalPages": 1,
            "hasNextPage": false, "hasPreviousPage": false }
}
```

```bash
# 6. Dashboard
curl -b cookies.txt http://localhost:5004/api/dashboard/summary
curl -b cookies.txt http://localhost:5004/api/dashboard/upcoming
```

```json
{"data":{"total":137,"byStatus":{"TODO":37,"IN_PROGRESS":52,"DONE":48},
  "overdue":6,"dueToday":3}}
```

```json
{"data":[{"id":"c41f8a1e-…","title":"Fix login redirect","status":"IN_PROGRESS",
  "priority":"HIGH","dueDate":"2026-10-08T00:00:00.000Z",
  "isOverdue":true,"daysUntilDue":-1}],
  "meta":{"page":1,"pageSize":10,"totalItems":9,"totalPages":1,
    "hasNextPage":false,"hasPreviousPage":false}}
```

```bash
# 7. GitHub — list repositories, link one, import issues
curl -b cookies.txt http://localhost:5004/api/github/repositories
curl -b cookies.txt -X POST http://localhost:5004/api/projects/a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70/github-repository \
  -H 'Content-Type: application/json' -d '{"githubId":"1296269"}'
curl -b cookies.txt -X POST http://localhost:5004/api/projects/a13b5c7d-9e42-4f18-b3a6-0d5c8e1f2b70/import-issues \
  -H 'Content-Type: application/json' -d '{"issueNumbers":[24,25,26]}'
```

```bash
# 8. Logout — 204, cookie cleared. Then /api/auth/me is 401.
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5004/api/auth/logout
```

---

## 8. Invariants

Rules a client may rely on. Each is asserted by a test; a violation is a bug, not a variation.

| # | Invariant | Enforced by |
| - | --------- | ----------- |
| 1 | `userId` never appears in any response body | Phase 02 §9 |
| 2 | `githubAccessToken` never appears in any response body | Phase 01 §9, Phase 11 §11 |
| 3 | No endpoint accepts a user ID for lookup | Phase 01 §10.6 |
| 4 | Another user's resource returns `404`, never `403` | Phase 01 §4.4 |
| 5 | No filter combination returns another user's data | Phase 03 §9.9 |
| 6 | `byStatus` sums exactly to `total`; a missing status is `0` | Phase 04 §9.2–9.3 |
| 7 | Every page of a filtered list is disjoint; the union contains each task exactly once | Phase 03 §11.3 |
| 8 | Repeated identical requests return identical ordering | Phase 03 §12.6 |
| 9 | `totalItems` and `totalPages` reflect the active filters | Phase 03 §12.5 |
| 10 | An imported issue gets `status: TODO` regardless of GitHub state | Phase 11 §12.4 |
| 11 | Moving an imported card makes no write call to GitHub | Phase 11 §12.5 |
| 12 | A GitHub failure never breaks local task endpoints | Phase 11 §11 |
| 13 | Login failure is indistinguishable between unknown email and wrong password | Phase 01 §10.3 |
| 14 | `isOverdue` is computed server-side and rendered verbatim | Phase 04 §9.5 |
| 15 | `githubId` serialises as a string, never a number | Phase 11 §11 |

---

## 9. Client Checklist

What a frontend implementer needs to get right:

- [ ] Send `credentials: 'include'` on every request
- [ ] Branch on `error.code`, never on `error.message`
- [ ] Render `isOverdue` and `daysUntilDue` as received — do not compare timestamps locally
- [ ] Treat `githubId` as a string; never `Number()`, never as a React `key` from arithmetic
- [ ] Treat every `*Count` and `byStatus.*` as `0`-defaulted, never `undefined`
- [ ] Distinguish an absent `PATCH` key from an explicit `null`
- [ ] Treat `404` on a user-owned resource as "gone", not "forbidden" — do not prompt for re-login
- [ ] Reset to page 1 when a filter changes, or page 2 of 1 renders empty
- [ ] Guard destructive project deletion behind a confirmation naming the project and `taskCount`
- [ ] Degrade GitHub UI independently — a failed repository list must not affect tasks, Board, or Roadmap
- [ ] Render `githubRepository: null` as "not linked" rather than hiding the affordance

---

## 10. Mapping to OpenAPI

Phase 10 §7.1 commits to generating the specification from Zod schemas in the handlers, so the spec cannot drift from the code. This document is the review reference for that generated artifact.

**Where each schema comes from**

| Schema | Source file | This document |
| ------ | ----------- | ------------- |
| `User` | `auth.schemas.ts` response schema + mapper | [§5.1](#51-user) |
| `Task`, `TaskSummary` | `tasks.schemas.ts` + `tasks.mapper.ts` | [§5.2](#52-task), [§5.3](#53-tasksummary) |
| `Project`, `ProjectListItem` | `projects.schemas.ts` + mapper | [§5.4](#54-project), [§5.5](#55-projectlistitem) |
| `Repository`, `Issue` | `github.schemas.ts` | [§5.6](#56-repository), [§5.7](#57-issue) |
| `PaginationMeta` | `lib/pagination.ts` | [§5.8](#58-paginationmeta) |
| Error envelope | `lib/errors.ts` | [§4.4](#44-error-envelope), [§4.5](#45-error-codes) |
| List query | `tasks.schemas.ts` `listQuery` | [§6.3](#63-tasks) |

**Tags** — one per section of §6: `Health`, `Auth`, `Tasks`, `Dashboard`, `Projects`, `GitHub`. Every endpoint carries exactly one.

**Served at**

```text
GET /api/docs          → Swagger UI
GET /api/openapi.json  → the generated specification
```

Both are documented as routes in [§6.7](#67-docs) so the parity test below covers them.

**Parity test.** Phase 10 §7.3 requires a test asserting that the path list in `openapi.json` matches the registered Express routes. Undocumented endpoints fail CI rather than surfacing in review. The twenty-seven routes in [§6](#6-endpoints) — twenty-five application routes plus the two documentation routes — are the expected set. A route registered in Express but absent from that list fails the test, and so does a documented route with no handler.

**Two entries need explicit `type` overrides** in the generated spec, because they will not be inferred correctly from TypeScript:

| Field | Declared as | Why |
| ----- | ----------- | --- |
| `githubId` | `type: string`, not `integer` | Prisma `BigInt`; `number` would lose precision |
| `issueNumbers` | `type: array of integer` | Items are small integers, unlike `githubId` |

---

## 11. Open Questions

Discrepancies found while assembling this document, and how each was resolved. All are documented rather than silently decided.

| # | Issue | Resolution |
| - | ----- | ---------- |
| 1 | Phase 11 §6.1 shows `"githubId": 1296269` as a number; §7.1 of the same document mandates a string | **String.** §7.1 is the explicit, reasoned decision — `BigInt` cannot survive `JSON.stringify`, and `number` loses precision. The §6.1 example is stale and should be corrected |
| 2 | Phase 11 adds `githubIssueNumber` and `githubState` to `Task`; the Phase 02 task table does not list them | **Included** in [§5.2](#52-task). Phase 11 is the later document and does not contradict Phase 02, only extends it |
| 3 | The Phase 00 §8 error table has seven codes; Phase 11 uses `422`, `428`, and `502` | **Extended** in [§4.5](#45-error-codes) as `UNPROCESSABLE`, `GITHUB_NOT_LINKED`, `UPSTREAM_ERROR`. The Phase 00 table should be updated to match |
| 4 | SRS §6.3 `meta` has four fields; Phase 03 §6 has six | **Phase 03's superset**, including `hasNextPage` and `hasPreviousPage` |
| 5 | SRS §5.1 `Task` has no `projectId`; Phases 00, 02, and 08 all add one | **Included.** The SRS table predates the project entity |
| 6 | Phase 00 §7 specifies `/api/health`'s body but never `/health`'s | **Defined** in [§6.1](#61-health): `status` and `uptimeSeconds`, without the `database` key |
| 7 | Phase 02 §5.3 has `GET /api/tasks` returning an unpaginated array; Phase 03 replaces it with the `data`/`meta` envelope | **Phase 03's envelope.** The frontend is not built until Phase 06, so nothing depends on the intermediate shape |
| 8 | `POST /api/projects/:id/import-issues` returns `200` with a partial-failure body, while Phase 11 §6.5 also documents `422` | **Both.** `422` when the request as a whole is unusable; `200` with `failed[]` when individual issues fail. Documented in [§6.6](#66-github) |
| 9 | Phase 11 §6.5 says nothing about a maximum `issueNumbers` length | **100**, stated in [§6.6](#66-github). Consistent with `pageSize` capping and `perPage` capping. Needs confirming |
| 10 | Phase 11 §6.2 does not state the success status for linking a repository | **201 Created** with the updated `Project`. Consistent with `POST /api/projects` and `POST /api/tasks` |
| 11 | `GET /api/projects` is unpaginated, so it returns no `meta` block, unlike every other list | **Intentional**, per [§6.5](#65-projects). A user's project count is small and bounded |
| 12 | Phase 14 §8 (DL-05) lists 26 routes and omits `/api/openapi.json`, which Phase 10 §7.2 specifies as a served route | **Documented** in [§6.7](#67-docs). Both spec-serving routes are registered Express routes, so the parity test in [§10](#10-mapping-to-openapi) requires both. Phase 14 §8's list should gain the entry |
| 13 | `JWT_SECRET` and `JWT_EXPIRES_IN` appear in Phase 00 §9, Phase 13 §5.1, and Phase 14 §6, but Phase 01 §4.1 chose **opaque session tokens** and rejected JWT | **Opaque sessions**, as this document specifies in [§3](#3-transport) and [§6.2](#62-auth). The two `JWT_*` variables are leftovers from the pre-decision draft and should be dropped from `.env.example` — shipping a `JWT_SECRET` implies a signing scheme the system does not use |
| 14 | Phase 14 §8 groups `/health`, `/api/health`, and `/api/docs` under a single "System" heading | **Split** into `Health` and `Docs` tags in [§6](#6-endpoints). `/api/docs` serves a specification, not a system probe, and the split keeps the Health tag limited to the two routes a platform health check should use |

Open items for confirmation: #9 and #10 are additions this document makes, not restatements. Items #13 and #14 are corrections the phase documents need, not choices this document made.

---

## 12. References

- [../srs.md](../srs.md) §3 Account Management · §4 GitHub Authentication · §5 Task Management · §6 Search, Filter & Pagination · §7 Dashboard · §8 Task Status · §10 Repository & GitHub Issues · §12 Project Creation · §15 Non-Functional Requirements · §17 Database Design · §18 Deliverables
- [Phase 00 — Backend Foundation](phase-00-backend-foundation.md) — error envelope, data model, health
- [Phase 01 — Backend: Accounts & Authentication](phase-01-backend-auth.md) — session cookie, hashing, OAuth
- [Phase 02 — Backend: Task CRUD](phase-02-backend-task-crud.md) — task contract, mapper boundary, ownership
- [Phase 03 — Backend: Search, Filter & Pagination](phase-03-backend-search-filter-pagination.md) — query parameters, list envelope
- [Phase 04 — Backend: Dashboard](phase-04-backend-dashboard.md) — summary, upcoming, due-date arithmetic
- [Phase 08 — Projects](phase-08-backend-frontend-projects.md) — project CRUD, task counts, `projectId` threading
- [Phase 10 — Testing, API Docs & CI](phase-10-testing-api-docs-ci.md) — OpenAPI generation, parity test
- [Phase 11 — GitHub Integration](phase-11-github-integration.md) — repositories, issues, import, `BigInt` handling
- [Phase 12 — Docker Compose & Kong](phase-12-docker-kong.md) — service topology, gateway CORS and rate limiting, build-time variables
- [Phase 13 — Deployment](phase-13-deployment.md) — Render topology, production OAuth callback, health checks
- [Phase 14 — Deliverables & Submission](phase-14-deliverables.md) — DL-05, the endpoint summary in its §8
