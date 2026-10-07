# Phase 13 — Deployment

> **Source:** [../srs.md](../srs.md) §16 Deployment
> **Priority:** Bonus · DL-02
> **Blocks:** Phase 14 (Deliverables — the demo link is part of the submission)

---

## 1. Objective

Deploy the application to a hosted platform so reviewers can run it without setting anything up locally. Deployment must not be the first time production-only problems appear.

---

## 2. Scope

### 2.1 In Scope

- Deploy PostgreSQL, the backend API, and the frontend to Render
- Environment variables and secrets configured in the platform
- Database migrations applied at deploy
- Seed data on first deploy
- HTTPS and CORS configured for the deployed origins
- Health check endpoint for the platform
- Deployment documented in the README
- Post-deploy smoke verification

### 2.2 Out of Scope

- Multi-region or blue-green deploys
- Auto-scaling
- A custom domain (optional if free tier is used)
- Production Kong — stays local via Docker Compose, per SRS §13
- Monitoring and alerting beyond the platform's built-in logs
- Infrastructure as code

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| — | Deployment includes frontend, backend, PostgreSQL | §16 Deployment |
| — | Kong local initially; production added later | §16 Deployment |
| — | Demo deployment delivered | Brief §2.B, DL-07 |
| — | No real secrets in the repository | §18 DL-03, §15 Security |

---

## 4. Platform

```text
Render
├── PostgreSQL          managed database
├── Web Service         backend API     Node
├── Static Site         frontend        built to dist/
└── (optional) Gateway  Kong, added post-MVP
```

Render is the SRS's stated platform (§16 Deployment). Any equivalent PaaS works; the important properties are a managed database, a Node web service, and static hosting.

### 4.1 Resource Topology

```text
Internet
   │
   ▼
Static Site  ──▶  dist/            (CDN, HTTPS)
   │
   ▼
Web Service  ──▶  :3000  /api/*    (HTTPS)
   │
   ▼
PostgreSQL                          (private network)
```

The static site and the web service are separate Render services with different origins, so the API's CORS configuration must allow the frontend's deployed URL — and the session cookie must be issued with `Secure: true`.

---

## 5. Configuration

### 5.1 Backend Environment Variables

Set in the Render dashboard or `render.yaml`. Never committed.

```dotenv
NODE_ENV=production
DATABASE_URL=<managed connection string>
FRONTEND_ORIGIN=https://<static-site>.onrender.com
JWT_SECRET=<generated>
BCRYPT_SALT_ROUNDS=12
GITHUB_CLIENT_ID=<configured>
GITHUB_CLIENT_SECRET=<configured>
GITHUB_CALLBACK_URL=https://<web-service>.onrender.com/api/auth/github/callback
```

### 5.2 Frontend Build Variables

```dotenv
VITE_API_URL=https://<web-service>.onrender.com/api
```

Set as a **build** environment variable, not a runtime one — Vite inlines `VITE_*` at build time (Phase 12 §5.3). Setting it after the build has no effect.

### 5.3 Secrets Handling

| Rule | Detail |
| ---- | ------ |
| Nothing real in the repo | `.env.example` carries placeholders only (DL-03) |
| Secrets in the platform | Render's environment variables |
| Rotate on exposure | `JWT_SECRET` or `GITHUB_CLIENT_SECRET` — rotate, do not patch |
| Local `.env` gitignored | Verified in Phases 01, 05, 12 |
| No secrets in CI logs | Masked in `.github/workflows/ci.yml` |

### 5.4 GitHub OAuth Callback

The production callback URL must be registered in the GitHub OAuth app. Free-tier hosts sleep and use rotating hostnames; confirm the Render service URL is stable before registering it, or OAuth will break on the next cold start.

---

## 6. Build and Release

### 6.1 Backend

```text
Build command   pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build
Start command   node dist/server.js
```

### 6.2 Migrations

Run as a pre-deploy or release step, **before** the new version serves traffic:

```text
npx prisma migrate deploy
```

`migrate deploy` applies pending migrations without prompting or generating anything — the correct command for production. Never `migrate dev` in production; it can reset the database.

Ordering matters: a migration incompatible with the currently running code must land as expand-then-contract, not as a destructive rename in one step.

### 6.3 Seed

Seed only on an empty database — `prisma db seed` guarded by a task-count check, or run once by hand. Seeding unconditionally on every deploy resets demo data that a reviewer may have modified.

---

## 7. Frontend

```text
Build command   pnpm build
Publish directory  dist
```

The static host must serve `index.html` for unknown paths, otherwise a hard refresh on `/tasks` returns 404. Render's static site setting, plus the same `try_files` behaviour as Phase 12.

---

## 8. Health Checks

Configure the platform health check against `GET /api/health` (Phase 00 §7).

The endpoint returns 503 when PostgreSQL is unreachable, so the platform will not route traffic to an instance whose database is down. Restart policy: on failure, once or twice.

---

## 9. Post-Deploy Verification

Run through this after every deploy, not just the first:

| # | Check | Expected |
| - | ----- | -------- |
| 1 | `GET /api/health` | 200, `database: connected` |
| 2 | Load the frontend URL | App renders |
| 3 | Register a new account | 201, redirected into the app |
| 4 | Log in | Session persists across a hard refresh |
| 5 | Create a task | Appears in the list |
| 6 | Search, filter, paginate | Results correct |
| 7 | Load the Dashboard | Counts match the seeded data |
| 8 | Drag a card on the Board | Persists across refresh |
| 9 | Log out, then reload | Redirected to `/login` |
| 10 | Open `/api/docs` | Swagger UI renders |
| 11 | Sign in with GitHub | OAuth redirect uses the production callback |
| 12 | Another user cannot read this user's task by ID | 404 |

Item 12 is the check reviewers are most likely to try. It should fail closed.

---

## 10. README Deployment Section

Document:

- Live demo URL
- Deploying from scratch — the render.yaml or manual steps
- Which environment variables must be set, and where
- Where the GitHub OAuth app is configured
- How to run migrations against the deployed database
- Free-tier limitations — sleep on inactivity, cold starts, database expiry

---

## 11. Tasks

- [ ] Provision the Render PostgreSQL database
- [ ] Provision the backend web service; set all §5.1 variables
- [ ] Configure `prisma migrate deploy` as a release step
- [ ] Seed the deployed database once, guarded
- [ ] Provision the frontend static site; set `VITE_API_URL` as a **build** variable
- [ ] Configure SPA fallback on the static host
- [ ] Configure the health check against `/api/health`
- [ ] Set `FRONTEND_ORIGIN` to the static site's URL
- [ ] Confirm the session cookie is `Secure` in production
- [ ] Register the production GitHub OAuth callback URL
- [ ] Verify the GitHub client secret is absent from the repo
- [ ] Confirm the Render hostnames are stable before relying on the OAuth callback
- [ ] Run the §9 verification checklist end to end
- [ ] Add the demo URL and deploy instructions to the README

---

## 12. Acceptance Criteria

1. The application is reachable at a public HTTPS URL with no local setup.
2. The database, backend, and frontend are all deployed and connected.
3. Migrations are applied automatically at deploy, before traffic is served.
4. The demo database contains the seed data.
5. Register, login, logout, and session persistence all work in production.
6. HTTPS is enforced; the session cookie is `Secure`.
7. No real secret appears in the repository, the image, the build logs, or the CI logs.
8. Swagger UI is reachable on the deployed API.
9. GitHub OAuth works using the registered production callback.
10. The §9 verification checklist passes completely, including cross-user isolation.
11. The README documents the live URL and the deploy procedure.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| `VITE_API_URL` set at runtime and ignored | Configure it as a build variable; verify from the built bundle |
| Migrations run after the new code starts serving | Release step ordering, before traffic |
| CORS or cookie rejected on the deployed origins | `FRONTEND_ORIGIN` set; `Secure` cookie verified over HTTPS |
| Destructive migration against live data | Expand-then-contract; back up before applying |
| GitHub OAuth callback breaks after a cold start | Confirm hostnames are stable before registering |
| Free-tier sleep breaks the demo | Note limitations in the README; warm it shortly before submission |
| A secret leaked into the repository | `.gitignore` verified; rotate rather than patch if it happens |

---

## 14. Future Phases

Deferred: production Kong gateway, custom domain, automated deploys from CI, preview environments, database backups, uptime monitoring, error tracking.

---

## 15. References

- SRS §16 Deployment
- SRS §15 Security
- SRS §18 Deliverables Checklist
- [Phase 10 — Testing, API Docs & CI](phase-10-testing-api-docs-ci.md)
- [Phase 12 — Docker Compose & Kong](phase-12-docker-kong.md)