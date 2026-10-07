# Phase 01 — Backend: Accounts & Authentication

> **Source:** [../srs.md](../srs.md) §3, §4
> **Priority:** Mandatory (Must) · FR-01 – FR-05
> **Blocks:** Phase 02, Phase 03, Phase 04, Phase 06

---

## 1. Objective

Deliver secure registration, login, logout, and GitHub OAuth for the backend. Every protected endpoint added in later phases relies on `requireAuth` middleware built here.

---

## 2. Scope

### 2.1 In Scope

- Email/password registration
- Email/password login
- Logout with session invalidation
- Password hashing (bcrypt, 12 salt rounds)
- Opaque session tokens stored in `Session`, delivered as an `HttpOnly` cookie
- `requireAuth` middleware
- Per-user data isolation enforced at the query layer
- Rate limiting on auth endpoints
- GitHub OAuth login (SRS §4)

### 2.2 Out of Scope

- Password reset / email verification (see §9 Future Phases)
- Frontend auth UI (Phase 05)
- GitHub repository listing (Phase 07)

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-01 | User can register an account | §3.1 |
| FR-02 | User can log in | §3.2 |
| FR-03 | User can log out | §3.3 |
| FR-04 | Passwords stored hashed, never plaintext | §3.4, §15 Security |
| FR-05 | User can only access their own data | §3.4, §15 Security |
| FR-23 | User can authenticate with GitHub | §4.2 |

---

## 4. Design Decisions

### 4.1 Session Strategy

Opaque random tokens in a `Session` table, not self-contained JWTs.

| Approach | Chosen | Why |
| -------- | ------ | --- |
| JWT | No | Cannot be revoked before expiry without extra state — logout would be a lie |
| Opaque session token | **Yes** | Immediate revocation on logout; lookup is one indexed query |

Token generation: `crypto.randomBytes(32).toString('base64url')` → 256 bits of entropy.

### 4.2 Password Hashing

bcrypt, 12 salt rounds, cost tuned to ~250 ms per hash on the target machine.

Hardening rules:
- Constant-time response for "email not found" and "wrong password" — both take the same code path and the same time, using a dummy hash comparison on the miss path.
- Never log email, password, or token values.
- Generic `INVALID_CREDENTIALS` error for all login failures.

### 4.3 Cookie Configuration

```text
Name        gpm_session
HttpOnly    true
Secure      true in production, false in development
SameSite    lax
Path        /
Max-Age     604800  (7 days, matches JWT_EXPIRES_IN)
```

### 4.4 Data Isolation

Every query that touches user-owned data filters by `userId` taken from the session — never from request input. A resource belonging to another user returns `404 NOT_FOUND`, not `403`, so the API does not confirm the resource exists.

---

## 5. API Surface

### 5.1 `POST /api/auth/register`

**Request**

```json
{
  "email": "dev@example.com",
  "password": "sup3rsecret",
  "displayName": "Dev"
}
```

**201 Created** — sets `gpm_session` cookie, returns the user:

```json
{
  "data": {
    "id": "0f9c…",
    "email": "dev@example.com",
    "displayName": "Dev",
    "createdAt": "2026-10-07T09:12:44.201Z"
  }
}
```

**Errors**

| Code | HTTP | Condition |
| ---- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Malformed email, password < 8 chars |
| `CONFLICT` | 409 | Email already registered |
| `RATE_LIMITED` | 429 | Too many attempts from this IP |

The 409 response must not reveal *which* field conflicted beyond "email is already in use" — acceptable here since the user supplied the email.

### 5.2 `POST /api/auth/login`

**Request**

```json
{ "email": "dev@example.com", "password": "sup3rsecret" }
```

**200 OK** — same response shape and cookie as register.

**Errors**

| Code | HTTP | Condition |
| ---- | ---- | --------- |
| `VALIDATION_ERROR` | 400 | Missing email or password |
| `UNAUTHENTICATED` | 401 | Unknown email **or** wrong password — indistinguishable |
| `RATE_LIMITED` | 429 | Too many attempts |

### 5.3 `POST /api/auth/logout`

**204 No Content** — deletes the `Session` row and clears the cookie. Idempotent: calling it without a session also returns 204.

### 5.4 `GET /api/auth/me`

**200 OK**

```json
{
  "data": {
    "id": "0f9c…",
    "email": "dev@example.com",
    "displayName": "Dev"
  }
}
```

**401** `UNAUTHENTICATED` when the session is missing, expired, or revoked.

### 5.5 `GET /api/auth/github`

**302 Found** → GitHub OAuth authorize URL.

### 5.6 `GET /api/auth/github/callback?code=…`

Exchanges the code for an access token, fetches the GitHub profile, then:

| Case | Behaviour |
| ---- | --------- |
| GitHub user already linked (`githubId` match) | Log them in, issue session |
| No match, but the email matches an existing user | Link the GitHub account to that user |
| No match | Create a new user with `passwordHash = null`, log them in |

**Errors**

| Code | HTTP | Condition |
| ---- | ---- | --------- |
| `UNAUTHENTICATED` | 401 | Missing or invalid `code` |
| `VALIDATION_ERROR` | 400 | GitHub returned an unusable profile |

OAuth credentials stay server-side; the access token is written to `User.githubAccessToken` and never returned in any response body.

---

## 6. Middleware

### 6.1 `requireAuth`

```text
1. Read gpm_session cookie
2. Look up Session by token where expiresAt > now()
3. No session        → 401 UNAUTHENTICATED
4. Attach req.user   → next()
```

Loads the full user record, not just the ID, so downstream handlers need no second query.

Expired sessions are deleted opportunistically during lookup.

### 6.2 `requireOwnership`

Used by Phase 02+ resource routes to assert the loaded row's `userId` matches `req.user.id`. On mismatch returns `404 NOT_FOUND` — see §4.4.

### 6.3 `rateLimit`

Applied per-route: 10 attempts / 15 min on login, 5 / 15 min on register, keyed by IP + email hash.

---

## 7. Code Structure

Layer rules in [architecture-backend.md](architecture-backend.md) §3. The service calls repositories; it never touches Prisma.

```text
src/presentation/auth/
├── auth.routes.ts
├── auth.controller.ts
├── auth.schemas.ts           # Zod request schemas
└── __tests__/

src/service/
├── auth.service.ts           # register, login, logout, getSessionUser, linkGitHubUser
├── github.service.ts         # OAuth exchange, profile fetch, linking rules
├── password.ts               # hash + verify, constant-time dummy path
├── token.ts                  # randomBytes generation + hashing for storage
└── __tests__/

src/repository/
├── user.repository.ts
└── session.repository.ts
```

Middlewares added to `src/middleware/` from Phase 00.

---

## 8. Tasks

- [ ] Add `bcrypt` (or `@node-rs/bcrypt`) and a rate-limit dependency
- [ ] `password.ts` — `hashPassword`, `verifyPassword` with constant-time miss path
- [ ] `token.ts` — generate session token, hash it before storing
- [ ] `auth.schemas.ts` — Zod schemas for register / login bodies
- [ ] `auth.service.ts` — `register`, `login`, `logout`, `getSessionUser`, `linkGitHubUser`
- [ ] `github.service.ts` — code exchange, profile fetch, three-case linking rules
- [ ] `auth.controller.ts` — HTTP boundary, cookie set/clear, status codes
- [ ] `auth.routes.ts` — mount router
- [ ] `requireAuth`, `requireOwnership`, `rateLimit` middleware
- [ ] Register router in `src/presentation/index.ts`
- [ ] Index `Session.expiresAt` is in the Phase 00 schema — confirm
- [ ] Scheduled/lazy cleanup of expired sessions
- [ ] Confirm no log statement ever receives a password or token

---

## 9. Tests

| Test | Type | Asserts |
| ---- | ---- | ------- |
| Register creates a user with a bcrypt hash, not plaintext | unit | hash ≠ password, verifies against bcrypt |
| Register with a duplicate email → 409 | integration | |
| Register with a bad email or short password → 400 with field errors | integration | |
| Login with valid credentials → 200 + session cookie | integration | |
| Login with wrong password → 401 `UNAUTHENTICATED` | integration | |
| Login with unknown email → same code and comparable timing | integration | |
| Logout invalidates the session | integration | old cookie → 401 on `/me` |
| Logout without a session → 204 | integration | idempotent |
| `/me` without a cookie → 401 | integration | |
| `/me` with an expired session → 401 and the row is deleted | integration | |
| Protected route with a valid session → passes | integration | |
| Login rate limit triggers → 429 | integration | |
| GitHub callback, existing user → logs in | integration | mocked GitHub API |
| GitHub callback, matching email, no `githubId` → links, no new user | integration | mocked GitHub API |
| GitHub callback, no match → creates user with null `passwordHash` | integration | mocked GitHub API |
| `githubAccessToken` is never present in any response body | integration | |

---

## 10. Acceptance Criteria

1. A new user can register, is logged in immediately, and receives an `HttpOnly` `gpm_session` cookie.
2. `User.passwordHash` in the database is a bcrypt hash; the plaintext password appears nowhere in the database or in logs.
3. Login with wrong password and login with unknown email return an identical status, error code, and message.
4. After logout, the previously issued cookie is rejected by `/api/auth/me` with 401.
5. Register and login are rate-limited and return 429 past the threshold.
6. A user cannot read another user's session or profile by guessing IDs — there is no endpoint that accepts a user ID for lookup.
7. GitHub login works for all three linking cases and never returns the GitHub access token to the client.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Timing attack distinguishes "email exists" from "wrong password" | Constant-time dummy bcrypt verify on the miss path; assert in the timing test |
| Session token leaked via logs or a client-readable cookie | Hash tokens at rest, `HttpOnly` + `SameSite=lax` + `Secure` in prod, audit log statements |
| Session table grows unbounded | Lazy cleanup during lookup plus an expiry index |
| GitHub OAuth callback abused as an open redirect | Fixed, allowlisted return paths only — no `redirect_uri` taken from user input |
| `githubAccessToken` leaked in a JSON serialisation accident | Omit the field from every response mapper; assert in tests |

---

## 12. Future Phases

Deferred, not committed: password reset, email verification, refresh-token rotation, multi-factor authentication, OAuth account unlinking.

---

## 13. References

- SRS §3 Account Management
- SRS §4 GitHub Authentication
- SRS §11 Security
- SRS §12 Reliability
- [Phase 00 — Backend Foundation](phase-00-backend-foundation.md)