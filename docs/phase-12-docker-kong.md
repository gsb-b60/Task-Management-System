# Phase 12 — Docker Compose & Kong Gateway

> **Source:** [../srs.md](../srs.md) §16 Containerization, §16 API Gateway, §18
> **Priority:** Bonus · FR-28 · DL-02
> **Blocks:** Phase 13

---

## 1. Objective

Make the whole application start with one command on any machine, with no global tooling beyond Docker, and route API traffic through the Kong gateway.

---

## 2. Scope

### 2.1 In Scope

- `docker compose up` brings up PostgreSQL, the backend API, and the frontend
- `docker compose up --profile gateway` adds Kong
- Multi-stage builds for backend and frontend
- Compose file with named volumes and a private network
- Health checks and dependency ordering
- Seed runs automatically on first database start
- Kong declarative configuration for routing, rate limiting, and CORS
- README instructions for both paths

### 2.2 Out of Scope

- Production Kubernetes, Helm, or ECS
- Automated image publishing to a registry (Phase 13)
- Secrets management beyond `.env` files
- Log aggregation
- Horizontal scaling

---

## 3. Requirements Traceability

| ID | Requirement | SRS Source |
| -- | ----------- | ---------- |
| FR-28 | Application runs via Docker Compose | §16 Containerization |
| — | Dockerized development environment | §2.1 |
| — | Kong gateway: routing, rate limiting, API entry point | §16 API Gateway |
| — | PostgreSQL in the development environment | §16 Containerization |
| — | README with installation and run instructions | §18 DL-02 |

---

## 4. Services

```text
┌──────────────────────────────────────────────────────┐
│  postgres      PostgreSQL 16          :5432          │
│  api           Node API  TypeScript    :5004          │
│  web           React build via nginx   :8080          │
│  kong          Kong Gateway  :8000     [profile]     │
└──────────────────────────────────────────────────────┘
```

| Service | Image | Port | Profile |
| ------- | ----- | ---- | ------- |
| `postgres` | `postgres:16-alpine` | `5432` | default |
| `api` | built from `backend/Dockerfile` | `5004` | default |
| `web` | built from `frontend/Dockerfile` | `8080` | default |
| `kong` | `kong:3.9` | `8000`, `8443` | `gateway` |

Default profile must start successfully on its own. Kong is optional from the start — making it mandatory couples the local setup to a service that is not needed to develop against the API.

---

## 5. Dockerfiles

### 5.1 Backend — Multi-stage

```text
Stage 1  deps      install all deps (build included)
Stage 2  build     tsc → dist/
Stage 3  runtime   production deps only, copy dist/ and prisma/
```

Runtime stage specifics:

- Base `node:20-alpine`
- Runs as a non-root user
- `NODE_ENV=production`
- Holds only `node_modules --prod`, `dist/`, and `prisma/`

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps  /app/node_modules      ./node_modules
COPY --from=build /app/dist              ./dist
COPY --from=build /app/prisma            ./prisma
COPY package.json ./
USER app
EXPOSE 5004
CMD ["node", "dist/server.js"]
```

`.dockerignore` excludes `node_modules`, `dist`, `.env`, and test artefacts — without it the build context balloons and local secrets can be baked into an image layer.

### 5.2 Frontend — Multi-stage

```text
Stage 1  build     vite build → dist/
Stage 2  runtime   nginx:alpine serving dist/ with SPA fallback
```

SPA fallback is required — without it, a hard refresh on `/tasks` returns nginx's 404 instead of the app.

```nginx
server {
  listen 8080;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### 5.3 The Vite Build-Time Trap

Vite inlines `VITE_*` variables at **build time**. A Docker build therefore bakes in the API URL at image build, not at container start.

```text
Wrong:  build with VITE_API_URL=http://localhost:5004/api
        → the image always points at localhost

Right: build an argument
        docker build --build-arg VITE_API_URL=https://api.example.com
```

Record this in the README. It is the single most common source of "works locally, broken in Docker" for this stack.

---

## 6. Compose Configuration

### 6.1 Structure

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: todogit
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/prisma/seed.sql:/docker-entrypoint-initdb.d/10-seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d todogit"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/todogit?schema=public
      FRONTEND_ORIGIN: http://localhost:8080
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:5004/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 10s
      retries: 5

  web:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://localhost:8000/api
    depends_on:
      api:
        condition: service_healthy

  kong:
    image: kong:3.9
    profiles: ["gateway"]
    volumes:
      - ./infra/kong/kong.yml:/etc/kong/kong.yml
      - ./infra/kong/:/kong/declarative/
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
    ports:
      - "8000:8000"
    depends_on:
      - api

volumes:
  pgdata:
```

### 6.2 Notes

- **Service names over `localhost`** — inside the network the API is `api:5004`, not `localhost:5004`.
- **`depends_on: condition: service_healthy`** — Compose's default `depends_on` only waits for the container to start, not for Postgres to accept connections. Without the healthcheck condition the API crashes on first boot.
- **Named volume `pgdata`** so data survives `docker compose down`. Plain `docker compose down -v` destroys it — note that in the README.
- **Seed on first init only** — `docker-entrypoint-initdb.d` runs only when the volume is empty. Document how to re-seed.

---

## 7. Kong Gateway

Declarative configuration, no database.

```yaml
_format_version: "3.0"
services:
  - name: api-service
    url: http://api:5004
    routes:
      - name: api-route
        paths:
          - /api
        strip_path: false
    plugins:
      - name: rate-limiting
        config:
          minute: 120
          policy: local
          hide_client_headers: false

  - name: web-service
    url: http://web:8080
    routes:
      - name: web-route
        paths:
          - /
    plugins:
      - name: cors
        config:
          origins:
            - http://localhost:8000
          methods: [GET, POST, PATCH, DELETE, OPTIONS]
          credentials: true
```

| Concern | Configuration |
| ------- | ------------- |
| Request routing | Routes to `api:5004` and `web:8080` |
| Rate limiting | 120 requests/minute per client, applied at the gateway |
| CORS | Credentials allowed — required for the session cookie |
| Single entry point | `:8000` serves both SPA and API |

The CORS `credentials: true` matters: without it the browser drops the session cookie on cross-origin requests and login appears to succeed but nothing persists.

### 7.1 Source of Truth

Kong is **not** the source of truth. Every route must work without it:

```text
API alone:      http://localhost:5004/api
With Kong:      http://localhost:8000/api
```

Authentication is enforced in the API, not at the gateway. A Kong-only auth check would make the backend unauthenticated for anyone who bypasses the gateway — and in development, the API is directly reachable on `5004`.

---

## 8. Developer Workflow

| Action | Command |
| ------ | ------- |
| Start everything | `docker compose up` |
| Start with Kong | `docker compose --profile gateway up` |
| Reset the database | `docker compose down -v && docker compose up` |
| View logs | `docker compose logs -f api` |
| Run migrations | `docker compose exec api npx prisma migrate deploy` |
| Re-seed | `docker compose exec api npx prisma db seed` |
| Rebuild after a code change | `docker compose up --build` |
| Shell into the API | `docker compose exec api sh` |

Documentation also covers running locally without Docker, since some contributors prefer host tooling.

---

## 9. Tasks

- [ ] `backend/Dockerfile` — three stages, non-root runtime
- [ ] `backend/.dockerignore`
- [ ] `frontend/Dockerfile` — build then nginx, with SPA fallback
- [ ] `frontend/nginx.conf`
- [ ] `frontend/.dockerignore`
- [ ] `docker-compose.yml` with the four services, volumes, and profiles
- [ ] `infra/kong/kong.yml` — declarative, no database
- [ ] Migrations applied at container start, before the API serves
- [ ] Seed wired to first database init
- [ ] Health checks on `postgres` and `api`; `depends_on` conditions using them
- [ ] `VITE_API_URL` as a build arg, not hardcoded
- [ ] Verify `docker compose up` works on a clean machine with only Docker installed
- [ ] Verify `--profile gateway` works and that CORS with credentials passes
- [ ] README: Docker instructions, the Vite build-time caveat, local-without-Docker instructions

---

## 10. Acceptance Criteria

1. On a clean machine with only Docker installed, `docker compose up` yields a working application.
2. PostgreSQL, the API, and the frontend all start, in the correct order, without manual intervention.
3. Migrations run automatically; the demo account exists on first boot.
4. `docker compose --profile gateway up` adds Kong on `:8000`, routing both the API and the SPA through it.
5. Login works through Kong with CORS credentials enabled — the session cookie persists.
6. Every route also works with Kong absent; the gateway is not a single point of failure.
7. Data survives `docker compose down` and `up`; only `down -v` resets it.
8. No real secrets appear in any Dockerfile, Compose file, or committed `.env`.
9. The runtime container runs as a non-root user.
10. The README documents every command in §8 and the Vite build-time variable caveat.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| API boots before Postgres is ready | `depends_on: condition: service_healthy` |
| `VITE_API_URL` baked as `localhost` at build time | Build argument; documented in the README |
| Nginx 404s on a hard refresh of a client route | `try_files $uri $uri/ /index.html` |
| Session cookie dropped through Kong | CORS `credentials: true` plus a matching `FRONTEND_ORIGIN` |
| Kong becomes a hard dependency | API fully functional without it; not in the default profile |
| Secrets baked into image layers | `.dockerignore` excludes `.env`; Compose reads from a local `.env` |
| `node_modules` from the host copied into the image | `.dockerignore` in both packages |
| Seed appears not to re-run | Document that init scripts run only on an empty volume |

---

## 12. Future Phases

Deferred: image registry publishing, multi-stage CI builds, non-root database, read-only root filesystems, health-based auto-restart, resource limits, log shipping.

---

## 13. References

- SRS §16 Containerization
- SRS §16 API Gateway
- SRS §15 Security
- SRS §18 Deliverables Checklist
- [Phase 10 — Testing, API Docs & CI](phase-10-testing-api-docs-ci.md)