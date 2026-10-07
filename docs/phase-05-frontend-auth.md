# Phase 05 — Frontend: Auth, Layout & API Client

> **Source:** [../srs.md](../srs.md) §3, §4, §13
> **Priority:** Mandatory (Must) · FR-01 – FR-05
> **Blocks:** Every later frontend phase

---

## 1. Objective

Stand up the frontend shell — routing, API client, session handling — and build the Register, Login, and protected-route behaviour against the Phase 01 backend.

---

## 2. Scope

### 2.1 In Scope

- API client with credentials, error-envelope parsing, base URL config
- Auth context: session state, `login`, `register`, `logout`, `refreshUser`
- Route protection and public-route redirects
- Register, Login, and Logout screens
- App shell: header, nav, user menu, loading and error states
- GitHub OAuth button and callback route
- 401 interceptor — global sign-out on session expiry

### 2.2 Out of Scope

- Task list, Dashboard, Board, Roadmap (Phases 06 – 09)
- Project creation UI
- Design system beyond layout primitives

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-01 | User can register | §13.1 |
| FR-02 | User can log in | §13.2 |
| FR-03 | User can log out | §13.3 |
| FR-05 | Protected views require a session | §3.4 |

---

## 4. Technical Decisions

| Concern | Choice | Why |
| ------- | ------ | --- |
| Build | Vite (already configured) | Repo standard |
| Framework | React 19 | Already in `package.json` |
| Language | TypeScript | Already configured |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` | Already in `package.json` |
| Routing | React Router 7 | Small, sufficient, no server requirement |
| Server state | TanStack Query 5 | Cache invalidation, retries, dedupe — hand-rolling this is a common source of bugs |
| Forms | React Hook Form + Zod | Shared Zod schemas with the API boundary |
| Client state | React Context | Session only; task data stays in the query cache |
| HTTP | `fetch`, not axios | Native, no dependency; `credentials: 'include'` on every call |

---

## 5. Screens

### 5.1 Register — SRS §13.1

```text
Git Project Manager

Name:      [________________]

Email:     [________________]

Password:  [________________]

[ Create Account ]

Already have an account? Log in
```

Behaviour:
- Client-side validation mirrors the server's Zod rules, for feedback speed only — the server remains the authority.
- Submit disabled while in flight.
- On 409, surface "Email is already in use" on the email field.
- On 400, map `error.details[]` onto the matching fields.
- On success, establish the session and redirect to the next route.

### 5.2 Login — SRS §13.2

```text
Git Project Manager

Email:     [________________]

Password:  [________________]

[ Log In ]

────────  or  ────────

[ Continue with GitHub ]
```

Behaviour:
- 401 → generic "Invalid email or password" form-level error. Never state which field was wrong.
- 429 → "Too many attempts. Try again shortly." with the retry hint.

### 5.3 App Shell

```text
┌──────────────────────────────────────────────────┐
│ Git Project Manager          [Board] [Roadmap]  │
│                                  Dev ▾  [Logout]│
├──────────────────────────────────────────────────┤
│                                                  │
│                    page content                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 5.4 OAuth Callback

`/auth/github/callback` is a public route that waits for the backend redirect. It shows a spinner while the session is established, then redirects to the dashboard or shows the error from the backend.

---

## 6. Routing

```text
/                          → redirect to /dashboard (auth) or /login (guest)
/register                  → public
/login                     → public
/auth/github/callback      → public
/dashboard                 → protected
/tasks                     → protected
/tasks/:id                 → protected
/board                     → protected
/roadmap                   → protected
/projects                  → protected
*                          → 404
```

Guard rules:
- Protected route + no session → redirect to `/login`, preserving the intended path for post-login return
- Public route + active session → redirect to `/dashboard`

---

## 7. Session Handling

### 7.1 Strategy

The session lives in an `HttpOnly` cookie set by the backend. JavaScript cannot read it, and the frontend must never try — it holds no token.

On mount, `GET /api/auth/me` determines whether a session exists. `401` means no session, which is a normal state, not an error to surface.

```text
App mount
   ↓
GET /api/auth/me
   ├─ 200 → session established, render protected area
   └─ 401 → render public routes
```

### 7.2 Context Shape

```text
AuthProvider
├── status:  'loading' | 'authenticated' | 'unauthenticated'
├── user:    User | null
├── login(email, password)
├── register(input)
├── logout()
└── refreshUser()
```

While `status === 'loading'`, render a full-page splash. Rendering protected content before the session check resolves causes a flash of the login screen on every refresh.

### 7.3 401 Interceptor

Any API call returning 401 sets status to `unauthenticated` and clears the cached user, redirecting to `/login`. This makes an expired server-side session behave correctly without every component checking.

---

## 8. API Client

```text
apiClient
├── baseUrl from VITE_API_URL
├── credentials: 'include' on every request
├── JSON request/response handling
├── throws ApiError { code, message, details[] } parsed from the error envelope
└── on 401 → clear session, redirect to /login
```

`ApiError` exposes the code so callers can branch on `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, or `UNAUTHENTICATED` without string-matching messages.

TanStack Query defaults: `retry` false for 4xx, true up to 2 times for 5xx and network errors, `refetchOnWindowFocus` false for list queries that are cheap to revalidate.

---

## 9. Project Layout

```text
frontend/src/
├── main.tsx
├── App.tsx                  # router definition
├── api/
│   ├── client.ts            # fetch wrapper, ApiError
│   ├── auth.ts              # register / login / logout / me
├── contexts/
│   └── AuthContext.tsx
├── routes/
│   ├── ProtectedRoute.tsx
│   └── PublicRoute.tsx
├── components/
│   └── layout/
│       ├── AppShell.tsx
│       ├── Header.tsx
│       └── Splash.tsx
├── pages/
│   ├── auth/
│   │   ├── RegisterPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── GitHubCallbackPage.tsx
│   ├── DashboardPage.tsx    # stubbed until Phase 06
│   └── NotFoundPage.tsx
├── lib/
│   ├── queryClient.ts
│   └── validation/          # Zod schemas mirroring the API
└── styles/
```

---

## 10. Environment

```dotenv
VITE_API_URL="http://localhost:5004/api"
```

`.env.example` at the repo root or in `frontend/`, placeholders only. Confirm `.env` is gitignored — `frontend/.gitignore` exists, verify it covers `.env*`.

---

## 11. Tasks

- [ ] Add `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`
- [ ] `api/client.ts` — fetch wrapper with credentials, `ApiError`, 401 handling
- [ ] `api/auth.ts` — the four auth calls
- [ ] `lib/queryClient.ts` — QueryClient defaults
- [ ] `AuthContext.tsx` — status, user, login/register/logout/refresh
- [ ] `ProtectedRoute.tsx`, `PublicRoute.tsx`, `Splash.tsx`
- [ ] `AppShell.tsx` + `Header.tsx` with user menu and logout
- [ ] `RegisterPage.tsx` with field-level error mapping
- [ ] `LoginPage.tsx` with generic error handling
- [ ] `GitHubCallbackPage.tsx`
- [ ] `App.tsx` router with all routes; stub `DashboardPage`
- [ ] `NotFoundPage.tsx`
- [ ] Tailwind base styles and layout primitives
- [ ] `.env.example` for the frontend; verify `.env` gitignored
- [ ] Verify `pnpm --filter frontend build` passes `tsc -b` with zero errors

---

## 12. Tests

| Test | Type | Asserts |
| ---- | ---- | --------- |
| Register validates email format client-side | component | field error shown, no request sent |
| Register submits and redirects on success | component | |
| Register 409 → error on the email field | component | uses `ApiError.code`, not message text |
| Register 400 with `details[]` → errors mapped per field | component | |
| Login 401 → generic message, not field-specific | component | |
| Login 429 → rate-limit message | component | |
| Submit button disabled while the request is in flight | component | |
| Protected route with no session → redirect to `/login` | component | |
| Public route with an active session → redirect to `/dashboard` | |
| Intended path is restored after login | component | |
| Splash renders while the session check is in flight | component | no login-screen flash |
| Logout clears the session and returns to `/login` | component | |
| Any API 401 globally signs the user out | component | |
| `ApiError` carries `code`, `message`, `details` | unit | |

---

## 13. Acceptance Criteria

1. A new user can register, is signed in, and lands on a protected route.
2. A returning user can log in and is returned to the path they originally requested.
3. Logging out clears the session; a browser refresh does not restore it.
4. Direct navigation to `/dashboard` without a session redirects to `/login` and no protected content flashes.
5. A 401 from any endpoint signs the user out rather than leaving a broken screen.
6. No password or token is ever read into JavaScript state or written to the console.
7. Server validation errors appear against the correct field.
8. `pnpm --filter frontend build` and `pnpm --filter frontend lint` both pass.

---

## 14. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Login page flashes on every hard refresh | Render the splash until `/me` resolves |
| Frontend validation drifts from the server's | Share Zod schemas conceptually; always render server errors from `details[]` |
| 401s leave components in a broken loading state | Global 401 interceptor clears session state in one place |
| Cookies blocked in a cross-origin dev setup | Explicit `credentials: 'include'` plus matching CORS origin; verified against `FRONTEND_ORIGIN` |

---

## 15. Future Phases

Deferred: password reset flow, email verification prompt, "remember me", multi-account switching, OAuth unlinking.

---

## 16. References

- SRS §3 Account Management
- SRS §4 GitHub Authentication
- SRS §13 Main Screens
- [Phase 01 — Backend: Accounts](phase-01-backend-auth.md)