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
| Routing | React Router 7 data router (`createBrowserRouter`) | Small, sufficient, no server requirement |
| Server state | TanStack Query 5 | Cache invalidation, retries, dedupe — hand-rolling this is a common source of bugs |
| Forms | React Hook Form + Zod | Shared Zod schemas with the API boundary |
| Client state | React Context | Session only; task data stays in the query cache |
| HTTP | `fetch`, not axios | Native, no dependency; `credentials: 'include'` on every call |
| Data source | Interface + mock implementation | `AuthApi`/`DataApi` have two implementations; the mock is selected at one wiring point, so components never branch on it |
| Tests | Vitest + Testing Library | Mandated by [Phase 10](phase-10-testing-api-docs-ci.md) §5 |

### 4.1 Mock API Layer

The backend is an empty scaffold — Phases 00–04 have not landed — so the frontend
would otherwise have nothing to render. Rather than stub calls inside components,
both sides of the API are defined as interfaces and implemented twice:

| Contract | Real | Mock |
| -------- | ---- | ---- |
| `AuthApi` | `api/auth.ts` `fetchAuthApi` | `api/mock/auth.ts` `mockAuthApi` |
| `DataApi` | `api/auth.ts` `fetchDataApi` | `api/mock/data.ts` `mockDashboardApi` / `mockTasksApi` / `mockProjectsApi` |

`api/index.ts` picks one implementation:

```text
VITE_USE_MOCK_API !== 'false'  → mock  (the default, until Phase 01 exists)
VITE_USE_MOCK_API === 'false'  → fetch
```

What the mock reproduces faithfully, because getting these wrong in the real
implementation is exactly what the phase is testing for:

- `400 VALIDATION_ERROR` with a per-field `details[]`
- `409 CONFLICT` naming the email as taken
- `401 UNAUTHENTICATED` **byte-identical** for "no such account" and "wrong
  password", with an equal-cost comparison on the miss path
- `429 RATE_LIMITED` after the attempt limit
- `204` on `logout`, idempotent
- `GET /auth/me` → `401` with no session; `createdAt` omitted on success

State lives in `api/mock/db.ts`, seeded from the mockup's own fixtures: 137
tasks split 37 `TODO` / 52 `IN_PROGRESS` / 48 `DONE`, 6 overdue, 3 due today,
`Portfolio Website` holding 12 of them. `isOverdue` and `daysUntilDue` are
server-shaped values on the fixture, so no screen can quietly recompute them
from the browser clock.

Every state in the mockup is reachable by hand — append `?scenario=error`,
`?scenario=slow` or `?scenario=empty` to any URL. `setMockLatency(0)` and
`setScenario()` are the test hooks behind it.

The one thing the mock cannot reproduce is the `HttpOnly` cookie, which
JavaScript cannot read. It mirrors the session token into `localStorage` purely
so a browser refresh keeps the session; the real client never touches storage.

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
/auth/github/callback      → public, and outside the session gate
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

Two refinements the implementation forced, both tested:

- **The post-login return path is honoured on the way *out* too.** A signed-in
  visitor who lands on `/login?redirect=/board` goes to `/board`, not to
  `/dashboard`. Without this, registering from a deep link silently drops the
  destination — the guard's own redirect beats the form's.
- **`/auth/github/callback` sits outside the session gate.** That route *is* the
  session check; nesting it inside `PublicRoute` replaces its own
  "Signing you in with GitHub…" state with the `GET /api/auth/me` splash.

`?redirect=` is attacker-controlled, so `lib/redirect.ts` sanitises it:
`safeRedirect()` accepts only rooted paths and rejects `//evil.com`,
`https://evil.com` and header breaks. Otherwise `/login?redirect=` is an open
redirect that carries the session off-site.

### 6.1 A failure that is not a sign-out

`GET /auth/me` answering `401` means "no session" — a normal state. Anything
else (a `500`, a dead network) is **not** "signed out", and must not bounce a
signed-in user to the login form, which would fail there too. The provider keeps
`status: 'loading'` and records `sessionCheckError`; `SessionGate` renders a
retry instead of either the splash or the login form.

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
├── main.tsx                     # providers + RouterProvider
├── App.tsx                      # route table, exported as data for tests
├── api/
│   ├── client.ts                # fetch wrapper, ApiError, 401 handler hook
│   ├── auth.ts                  # AuthApi / DataApi contracts + fetch impls
│   ├── types.ts                 # wire types mirrored from api-data-format.md
│   ├── index.ts                 # picks mock or fetch, once
│   └── mock/
│       ├── db.ts                # fixtures + session store + date-only helpers
│       ├── auth.ts              # mockAuthApi
│       ├── data.ts              # dashboard / tasks / projects / rate limit
│       ├── overrides.ts         # ?scenario= and latency switches
│       └── index.ts
├── contexts/
│   ├── auth-context.ts          # context, hook, types
│   └── AuthContext.tsx          # provider (separate file: Fast Refresh)
├── routes/
│   ├── ProtectedRoute.tsx
│   └── PublicRoute.tsx
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx           # topbar, tablet nav row, phone drawer
│   │   ├── Sidebar.tsx          # desktop ≥1024px
│   │   ├── ProjectSwitcher.tsx
│   │   ├── UserMenu.tsx
│   │   ├── SessionGate.tsx      # splash vs. session-check failure
│   │   ├── CenteredPanel.tsx
│   │   ├── nav.ts
│   │   └── useMenu.ts           # outside-click + Escape dismissal
│   └── ui/                      # Button, Input, Field, Alert, Divider,
│                                # Spinner, BrandMark, PasswordStrength, Icons
├── pages/
│   ├── auth/                    # RegisterPage, LoginPage, GitHubCallbackPage
│   ├── DashboardPage.tsx        # SC-06 / SC-07, ahead of Phase 06
│   ├── PlaceholderPage.tsx      # wired routes for Phases 06–09
│   └── NotFoundPage.tsx
├── hooks/                       # useDashboard, useProjects, useGitHubRateLimit
├── lib/
│   ├── queryClient.ts
│   ├── redirect.ts              # safeRedirect, isUnauthenticated
│   ├── format.ts                # due labels, date-only rendering
│   └── validation/schemas.ts
├── test/
│   ├── setup.ts
│   └── renderApp.tsx
└── index.css                    # Tailwind entry + @theme tokens
```

`auth-context.ts` and `AuthContext.tsx` are split deliberately: a module that
exports both a component and a hook defeats Fast Refresh, and the hook is what
the other 40-odd modules want.

## 9.1 Design System & Mockup Traceability

The mockup is the visual source of truth: `mockup/index.html` and
`mockup/screens/*.html`. Its Tailwind palette is reproduced 1:1 as a Tailwind v4
`@theme` block in `index.css`, so every class string in the mockup resolves here
unchanged — `text-fg`, `bg-subtle`, `border-line`, `bg-badbg`, `font-mono` and
the rest are not abbreviations invented by the app.

| Token | Value | | Token | Value |
| ----- | ----- |-| ----- | ----- |
| `canvas` | `#ffffff` | | `accent` | `#0969da` |
| `subtle` | `#f6f8fa` | | `ok` / `okbg` | `#1a7f37` / `#dafbe1` |
| `inset` | `#eff2f5` | | `bad` / `badbg` | `#cf222e` / `#ffebe9` |
| `fg` | `#24292f` | | `warn` / `warnbg` | `#9a6700` / `#fff8c5` |
| `muted` | `#57606a` | | `info` / `infobg` | `#8250df` / `#fbefff` |
| `faint` | `#6e7781` | | `ok-dark` | `#116329` (hover) |
| `line` | `#d0d7de` | | `accentbg` | `#ddf4ff` |
| `linesoft` | `#d8dee4` | | | |

Plus `--font-sans` and `--font-mono` from the mockup, a `:focus-visible` ring so
every control is keyboard-reachable, and the few structural rules utilities
cannot express (skeleton shimmer, `divide-y` borders) ported from
`mockup/assets/mockup.css`.

Blue stays an affordance only — links, focus rings, the active nav item.
Every status signal pairs a tint with a label, so meaning never depends on
colour alone.

| Screen | Component |
| ------ | --------- |
| SC-01 Register | `pages/auth/RegisterPage.tsx` — `CenteredPanel`, `BrandMark`, strength meter, per-field `details[]`, 409 banner |
| SC-02 Login | `pages/auth/LoginPage.tsx` — generic 401, 429 warning strip, redirect notice |
| SC-03 OAuth callback | `pages/auth/GitHubCallbackPage.tsx` — waiting spinner, failure state |
| SC-04 App shell | `layout/AppShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `ProjectSwitcher.tsx`, `UserMenu.tsx` |
| SC-05 404 & session expiry | `pages/NotFoundPage.tsx`, `layout/SessionGate.tsx` |
| SC-06 Dashboard | `pages/DashboardPage.tsx` — stat tiles, overdue/due-today tiles, upcoming table |
| SC-07 Dashboard states | same — skeleton rows, error + retry, empty panel, `?projectId=` scoped |

---

## 10. Environment

```dotenv
VITE_API_URL="http://localhost:3000/api"
VITE_USE_MOCK_API=true
VITE_MOCK_LATENCY=250
```

`VITE_API_URL` is inlined at build time — setting it after a production build
does nothing (Phase 12/13). `VITE_USE_MOCK_API=false` switches the whole app
from the mock layer to `fetch` once Phase 01 is up.

`frontend/.env.example` holds placeholders only. `.env` and `.env.*` are
gitignored with `!.env.example`.

---

## 11. Tasks

- [x] Add `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`
- [x] `api/client.ts` — fetch wrapper with credentials, `ApiError`, 401 handling
- [x] `api/auth.ts` — `AuthApi`/`DataApi` contracts and the four auth calls
- [x] `lib/queryClient.ts` — QueryClient defaults
- [x] `AuthContext.tsx` — status, user, login/register/logout/refresh
- [x] `ProtectedRoute.tsx`, `PublicRoute.tsx`, `SessionGate.tsx`
- [x] `AppShell.tsx` + `Header.tsx` with user menu and logout
- [x] `RegisterPage.tsx` with field-level error mapping
- [x] `LoginPage.tsx` with generic error handling
- [x] `GitHubCallbackPage.tsx`
- [x] `App.tsx` router with all routes; wire `DashboardPage`
- [x] `NotFoundPage.tsx`
- [x] Tailwind base styles and layout primitives
- [x] `.env.example` for the frontend; verify `.env` gitignored
- [x] Mock API layer behind the same contracts, with the mockup's fixtures
- [x] Verify `pnpm -C frontend build` passes `tsc -b` with zero errors

Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`,
`test:coverage`.

---

## 12. Tests

`vitest.config.ts` runs jsdom with `src/test/setup.ts`; `src/test/renderApp.tsx`
mounts the real route table in a memory router with the mock API injected, so
guards are exercised through the same wiring the browser gets. The setup file
zeroes mock latency and resets the fixture per test.

| Test | Type | Asserts | Status |
| ---- | ---- | ------- | ------ |
| Register validates email format client-side | component | field error shown, no request sent | ✅ |
| Register submits and redirects on success | component | returns to `?redirect=` path | ✅ |
| Register 409 → error on the email field | component | uses `ApiError.code`, not message text | ✅ |
| Register 400 with `details[]` → errors mapped per field | component | one message per reported field | ✅ |
| Login 401 → generic message, not field-specific | component | neither input marked invalid | ✅ |
| Login 429 → rate-limit message | component | warning strip, not an error strip | ✅ |
| Submit button disabled while the request is in flight | component | both forms | ✅ |
| Protected route with no session → redirect to `/login` | component | path preserved in `?redirect=` | ✅ |
| Public route with an active session → `/dashboard` | component | and to `?redirect=` when present | ✅ |
| Intended path is restored after login | component | register and login | ✅ |
| Splash renders while the session check is in flight | component | no login-screen flash | ✅ |
| Logout clears the session and returns to `/login` | component | via the user menu | ✅ |
| Any API 401 globally signs the user out | component | drives a real `request()` 401 | ✅ |
| `ApiError` carries `code`, `message`, `details` | unit | plus `fieldError()` and the status fallback | ✅ |
| `safeRedirect` rejects open redirects | unit | `//host`, `https://host`, header breaks | ✅ |
| `me` is a 401 with no session, not a surfaced error | unit | mock and real client | ✅ |
| A 500 from `/me` is not treated as a sign-out | component | gate shows retry, not the login form | ✅ |
| Fixture counts match the mockup | unit | 137 / 37 / 52 / 48 / 6 overdue / 3 due today | ✅ |
| No `DONE` task is ever flagged overdue | unit | status beats date | ✅ |
| Date-only values are local | unit | no UTC-midnight shift, month boundaries | ✅ |
| Dashboard tiles render the server counts | component | all four, plus overdue and due-today | ✅ |
| Dashboard renders all five list states | component | skeleton, error + retry, empty, scoped, success | ✅ |

105 tests, all passing. Coverage is 82% lines / 77% branches / 84% functions,
above the 70 / 65 / 75 frontend target in [Phase 10](phase-10-testing-api-docs-ci.md) §5.

---

## 13. Acceptance Criteria

1. A new user can register, is signed in, and lands on a protected route.
2. A returning user can log in and is returned to the path they originally requested.
3. Logging out clears the session; a browser refresh does not restore it.
4. Direct navigation to `/dashboard` without a session redirects to `/login` and no protected content flashes.
5. A 401 from any endpoint signs the user out rather than leaving a broken screen.
6. No password or token is ever read into JavaScript state or written to the console.
7. Server validation errors appear against the correct field.
8. `pnpm -C frontend build`, `pnpm -C frontend lint` and `pnpm -C frontend test` all pass.

All eight verified against the mock layer; items 1, 2 and 5 must be re-run
against the real API in Phase 01, since `credentials: 'include'` and the
`HttpOnly` cookie cannot be exercised before the backend exists.

---

## 14. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Login page flashes on every hard refresh | Render the splash until `/me` resolves |
| Frontend validation drifts from the server's | Share Zod schemas conceptually; always render server errors from `details[]` |
| 401s leave components in a broken loading state | Global 401 interceptor clears session state in one place |
| Cookies blocked in a cross-origin dev setup | Explicit `credentials: 'include'` plus matching CORS origin; verified against `FRONTEND_ORIGIN` |
| A 500 from `/me` reads as a sign-out | `SessionGate` distinguishes "still checking" from "could not check" and offers retry |
| `?redirect=` becomes an open redirect | `safeRedirect()` accepts rooted paths only |
| Components start branching on the mock | One wiring point in `api/index.ts`; components depend on the interfaces |
| Mock drift from the real API | Fixtures assert the mockup's documented counts; the real impl satisfies the same tests via `fetch` |

---

## 15. Future Phases

Deferred: password reset flow, email verification prompt, "remember me", multi-account switching, OAuth unlinking.

---

## 16. Deviations from the Original Plan

| Deviation | Why |
| --------- | --- |
| UI wordmark is **Task Stream**, not "Git Project Manager" | Matches `mockup/index.html` and the visual reference; the SRS name remains the product name in the docs |
| No `styles/` directory; tokens live in `src/index.css` | One Tailwind entry keeps the Vite plugin and the stylesheet in sync |
| Added `Sidebar.tsx`, `MobileNav` drawer, `SessionGate`, `ProjectSwitcher` | The ASCII sketch in §5.3 under-specified the shell; the mockup (SC-04) is the authority |
| `auth-context.ts` split from `AuthContext.tsx` | A module exporting both a component and a hook defeats Fast Refresh |
| Dashboard built ahead of Phase 06 | The mock layer already had the fixtures, and it gave the shell something real to render. Uses Phase 06 §4/§6 data shapes and fixtures only |
| `?scenario=` and `VITE_MOCK_LATENCY` added | Every state in the mockup is otherwise unreachable until the API exists |

---

## 17. References

- SRS §3 Account Management
- SRS §4 GitHub Authentication
- SRS §13 Main Screens
- [mockup/index.html](../mockup/index.html) — visual source of truth, SC-01 – SC-24
- [Phase 01 — Backend: Accounts](phase-01-backend-auth.md)
- [Phase 06 — Frontend: Tasks & Dashboard](phase-06-frontend-tasks-dashboard.md)
- [Phase 10 — Testing, API Docs & CI](phase-10-testing-api-docs-ci.md)