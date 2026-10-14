# [Nộp bài] Task Management System — Intern

- **Nguyen Dinh Hieu** — `dihieu2407@gmail.com`
- GitHub: https://github.com/gsb-b60 ·

- Portfolio: https://gsb-b60.github.io
- LinkedIn: https://www.linkedin.com/in/hieu-nguyendinh-969b21247

## Demo đang chạy

| Thành phần        | URL                                                           |
| ----------------- | ------------------------------------------------------------- |
| Frontend (SPA)    | https://taskstream-frontend.onrender.com                      |
| Backend API       | https://task-management-system-1-ykht.onrender.com/api        |
| API health        | https://task-management-system-1-ykht.onrender.com/api/health |
| Swagger / OpenAPI | https://task-management-system-1-ykht.onrender.com/api/docs   |

Tài khoản demo: `demo@example.com` / `password123`

## Công nghệ

- **Backend:** Node.js 22 + Express 5 + Prisma 6 + PostgreSQL (Neon) — session cookie HttpOnly, bcrypt (`@node-rs/bcrypt`), Zod validation.
- **Frontend:** React 19 + Vite + Tailwind 4 + TanStack Query + React Router 7.
- **DB:** PostgreSQL 16/18, migration versioned bằng Prisma (`backend/prisma/migrations/`), seed dữ liệu mẫu (`backend/prisma/seed.ts`).

## A. Chức năng bắt buộc (MVP) — hoàn thành 100%

- [x] **Quản lý tài khoản:** đăng ký, đăng nhập, đăng xuất (`POST /api/auth/register|login|logout`, `GET /api/auth/me`, `PATCH /api/auth/me`). Mật khẩu mã hóa bcrypt, session token opaque lưu HttpOnly cookie. Mọi query đều scope theo `userId` — user chỉ thấy dữ liệu của mình (có test isolation).
- [x] **Task CRUD:** tạo, xem, sửa, xóa (`/api/tasks`). Mỗi task có tiêu đề, mô tả, trạng thái (`TODO`, `IN_PROGRESS`, `DONE`), mức ưu tiên (`LOW`, `MEDIUM`, `HIGH`), ngày bắt đầu/hạn hoàn thành.
- [x] **Tìm kiếm và lọc:** tìm theo tiêu đề (`q`, dùng index trigram `pg_trgm`), lọc theo trạng thái + ưu tiên, phân trang (`page`, `pageSize`, kèm `meta`) — cả API và UI.
- [x] **Dashboard:** tổng số task, số liệu theo từng trạng thái, số quá hạn/đến hạn hôm nay, danh sách việc sắp đến hạn (`GET /api/dashboard/summary`, `GET /api/dashboard/upcoming`).

## B. Chức năng cộng điểm — hoàn thành toàn bộ

- [x] **Kanban kéo thả** (`/board`, dnd-kit, đổi trạng thái kéo thả giữa các cột).
- [x] **Docker Compose** (`docker-compose.yml`: postgres + api + web, optional Kong gateway và pgAdmin) — `docker compose up`
- [x] **Unit + integration test:** backend Vitest
- [x] **Swagger/OpenAPI** tại `/api/docs`.
- [x] **CI pipeline:** `.github/workflows/ci.yml` chạy lint → typecheck → migrate → test:coverage cho backend + frontend mỗi push/PR; thêm workflow `healthcheck.yml` ping `/health` + `/api/health` mỗi 15 phút.
- [x] **Deploy demo:** backend (Render Web Service + Neon Postgres) và frontend (Render Static Site) theo `RENDER.md`.

## Vượt yêu cầu đề bài

### Quản lý Project

- CRUD project: tên, mô tả, màu, ngày bắt đầu/mục tiêu; mỗi project của user được đánh số `#n` tự tăng (`#1 Portfolio`), hiển thị dạng badge khắp UI.
- Xóa mềm (`deletedAt`) — xóa nhầm không mất dữ liệu.
- Mọi màn hình scope theo project qua ProjectSwitcher: task list, board, dashboard chỉ tính đúng project đang chọn (`?projectId=`).
- Mỗi project hiển thị `taskCount` / `completedTaskCount` (tiến độ tổng quan).

### GitHub OAuth + đồng bộ issue

- **Đăng nhập bằng GitHub:** `GET /api/auth/github` → authorize → callback tự tạo/linking tài khoản + set session, redirect về SPA. Tài khoản có sẵn cũng liên kết/hủy liên kết được (`DELETE /api/auth/github`).
- **Biến repo thành project:** `POST /api/projects/from-github` — chọn repo trong dialog Import, app tạo project 1–1 với `GitHubRepository` (lưu `githubId`, owner, visibility, defaultBranch).
- **Biến issue thành task:** `POST /api/projects/:id/import-issues` — import từng issue hoặc tất cả (`state=all`, phân trang). Map trạng thái thông minh: `closed` → `DONE`, label `in progress`/`wip` → `IN_PROGRESS`, còn lại `TODO`. Pull request bị từ chối với 422 rõ ràng, issue không tồn tại báo 404 → 422.
- **Idempotent:** unique `(githubRepositoryId, githubIssueNumber)` nên import lại không bao giờ trùng — chạy lại chỉ thêm issue mới, cũ tự skip.
- **Hiển thị quota GitHub:** rate limit (`x-ratelimit-remaining/limit`) hiện ở sidebar, tự refetch sau khi login GitHub.
- Xem issue gốc của repo đã link: `GET /api/github/repositories/:githubId/issues`; task import giữ `githubIssueNumber` + `githubState` để đối chiếu.

## Checklist bàn giao

- [x] Pull Request vào repo gốc (PR này).
- [x] README hướng dẫn cài đặt và chạy (Docker 1 lệnh + chạy local không Docker).
- [x] File `.env.example` (root, `backend/`, `frontend/`) — chỉ placeholder, không secret thật.
- [x] Database migration (`backend/prisma/migrations/`, có khóa ngoại + ràng buộc) và seed dữ liệu mẫu.
- [x] API documentation: Swagger `/api/docs` + `docs/api-data-format.md`.
- [x] Danh sách hoàn thành/chưa hoàn thành: xem mục A–B ở trên — **không còn mục nào của đề bài chưa làm**.
- [ ] Video demo 3–5 phút — sẽ bổ sung link tại đây (hoặc demo trực tiếp).

## Thiết kế database (`backend/prisma/schema.prisma`)

PostgreSQL + extensions `citext` (email/title không phân biệt hoa thường) và `pg_trgm` (index GIN tìm tiêu đề).

### `User` — tài khoản (email hoặc GitHub-only)

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | uuid | PK |
| `email` | citext | unique |
| `passwordHash` | string | nullable (user GitHub-only không có) |
| `displayName` | string | nullable |
| `githubId` | string | unique, nullable |
| `githubLogin` / `githubAccessToken` | string | nullable |
| `projectSeq` | int | default 1 (đếm số project `#n`) |

### `Session` — phiên đăng nhập

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | uuid | PK |
| `token` | string | unique (opaque token trong cookie HttpOnly) |
| `userId` | uuid | FK → `User`, Cascade |
| `expiresAt` | datetime | hết hạn 7 ngày |

### `Project` — nhóm task của user

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | uuid | PK |
| `userId` | uuid | FK → `User`, Cascade |
| `name` / `description` | string | mô tả nullable |
| `startDate` / `targetDate` | datetime | nullable |
| `projectNumber` | int | unique theo `(userId, projectNumber)` |
| `deletedAt` | datetime | nullable (xóa mềm) |

### `Task` — công việc

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | uuid | PK |
| `userId` | uuid | FK → `User`, Cascade |
| `projectId` | uuid | FK → `Project`, Cascade, nullable |
| `title` | citext | index GIN trigram (tìm kiếm) |
| `description` | string | nullable |
| `status` | enum | `TODO` / `IN_PROGRESS` / `DONE` |
| `priority` | enum | `LOW` / `MEDIUM` / `HIGH` |
| `startDate` / `dueDate` | datetime | nullable |
| `githubRepositoryId` | uuid | FK → `GitHubRepository`, SetNull, nullable |
| `githubIssueNumber` / `githubState` | — | nullable; unique theo `(githubRepositoryId, githubIssueNumber)` |

Index phụ: `(userId, status)`, `(userId, priority)`, `(userId, dueDate)`, `(userId, projectId)`.

### `GitHubRepository` — repo link 1–1 với project

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | uuid | PK |
| `projectId` | uuid | FK → `Project`, Cascade, unique (1–1) |
| `githubId` | BigInt | unique |
| `fullName` / `owner` / `name` | string | định danh repo |
| `visibility` | enum | `public` / `private` |
| `description` / `defaultBranch` / `url` | string | nullable |

Enum: `TaskStatus` (`TODO`, `IN_PROGRESS`, `DONE`), `TaskPriority` (`LOW`, `MEDIUM`, `HIGH`), `IssueState` (`open`, `closed`), `Visibility` (`public`, `private`). Mọi bảng nghiệp vụ đều scope theo `userId` ở tầng repository.

## Cấu trúc project

```text
todogit/
├── backend/src/
│   ├── presentation/   # HTTP boundary: routes + controller + Zod schemas + OpenAPI
│   │   └── auth|tasks|projects|dashboard|github|health|docs
│   ├── service/        # business logic (auth, tasks, projects, dashboard, github, token, password)
│   ├── repository/     # Prisma data access, mọi query scope theo userId
│   ├── middleware/     # requireAuth, rateLimit, errorHandler
│   ├── lib/            # cookies, errors, pagination, dates, prisma client
│   ├── config/         # env (Zod-validated)
│   └── server.ts / app.ts
├── backend/prisma/     # schema.prisma, migrations/, seed.ts
├── frontend/src/
│   ├── pages/          # Login/Register, Dashboard, Tasks, TaskDetail, Board, Projects
│   ├── components/     # layout (AppShell/Header/Sidebar/Footer), ui, task, project, board
│   ├── api/            # fetch client + envelope, auth/tasks/projects/dashboard/github, mock (cho test)
│   ├── hooks/          # TanStack Query hooks (useDashboard, useTasks, useBoard, …)
│   ├── contexts/       # AuthContext (session)
│   ├── routes/         # ProtectedRoute, PublicRoute + guards
│   └── lib/            # format, queryKeys, redirect, validation
├── infra/kong/         # Kong gateway (optional profile)
├── docs/               # phase-00–14 + api-data-format, architecture-backend
├── docker-compose.yml  # postgres + api + web (+ kong, pgadmin profiles)
├── render.yaml         # blueprint deploy Render
└── .github/workflows/  # ci.yml, healthcheck.yml
```

## Cài đặt & chạy — 2 cách

### Cách 1: Docker (khuyên dùng, 1 lệnh)

Yêu cầu duy nhất: Docker + Compose v2.

```bash
docker compose up
```

| Service    | URL                              |
| ---------- | -------------------------------- |
| Frontend   | http://localhost:8080            |
| API        | http://localhost:5004/api        |
| API health | http://localhost:5004/api/health |

Lần boot đầu: PostgreSQL → API tự migrate + seed → nginx. Đăng nhập `demo@example.com` / `password123`. Data nằm ở volume `postgres_data` (chỉ mất khi `down -v`). Reset DB: `docker compose down -v && docker compose up`.

**Optional — Kong gateway** (`infra/kong/kong.yml`, profile `gateway`): một entry point duy nhất với rate limiting (120 req/phút) và CORS credentials.

```bash
docker compose --profile gateway up
# Duyệt todos qua gateway: http://localhost:8000  (API: http://localhost:8000/api)
```

Lưu ý: SPA bake `VITE_API_URL` lúc **build**, nên muốn mọi traffic trình duyệt đi qua Kong thì rebuild: `VITE_API_URL=http://localhost:8000/api docker compose --profile gateway up --build` (mặc định bundle trỏ thẳng `:5004`).

### Cách 2: Chạy local không Docker

Yêu cầu: Node 22+, pnpm 11.25 (`corepack enable`), PostgreSQL 16 (hoặc tái dùng DB của compose: `docker compose up -d postgres`).

```bash
# Backend (:5004)
cd backend
cp .env.example .env     # sửa DATABASE_URL/JWT_SECRET nếu cần
pnpm install
pnpm exec prisma migrate deploy
pnpm exec prisma db seed  # lần đầu; chạy lại với FORCE_SEED=1
pnpm dev

# Frontend (:5173) — terminal khác
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:5004/api, mock mặc định true
pnpm install
pnpm dev                 # đặt VITE_USE_MOCK_API=false để gọi API thật
```

Kiểm tra: `pnpm -C backend typecheck && pnpm -C backend test`, `pnpm -C frontend typecheck && pnpm -C frontend test` (test integration cần DB `todogit_test`, xem README §6.5).
