# Đề bài tuyển dụng Intern: Task Management System

Mini Project · Backend / Fullstack Developer · Thời gian: 2–3 ngày

## Quy trình làm bài 

Quy trình làm bài: 
- Fork repo về sau đó làm bài trên repo đó
- Sau khi làm bài xong tạo Pull request vào Repo gốc
- Gửi link PR và mô tả lại bài làm để nộp bài

![Kanban Project Management Dashboard UI for SaaS Platform by Creliq UX/UI Design Agency on Dribbble](https://raw.githubusercontent.com/TechVanguardVn/Task-Management-System/refs/heads/main/images/demo.jpeg)

## 1. Mục tiêu dự án

Xây dựng một ứng dụng quản lý công việc cá nhân hoặc nhóm nhỏ, cho phép người dùng tạo, cập nhật, theo dõi tiến độ và quản lý các công việc của mình.

Ứng viên được tự chọn công nghệ phù hợp với vị trí ứng tuyển. Dự án cần có source code, database, tài liệu hướng dẫn chạy và API nếu có Backend.

## 2. Yêu cầu chức năng

### A. Chức năng bắt buộc (MVP)

1. Quản lý tài khoản

* Đăng ký, đăng nhập, đăng xuất.

* Mật khẩu phải được mã hóa an toàn.

* Người dùng chỉ được truy cập dữ liệu của mình.

2. Quản lý công việc (Task CRUD)

* Tạo, xem, sửa, xóa công việc.

* Mỗi task có tiêu đề, mô tả, trạng thái, mức ưu tiên, hạn hoàn thành.

* Trạng thái: `TODO`, `IN_PROGRESS`, `DONE`.

3. Tìm kiếm và lọc

* Tìm kiếm theo tiêu đề.

* Lọc theo trạng thái và mức ưu tiên.

* Có phân trang nếu dữ liệu lớn.

4. Dashboard

* Tổng số task.

* Số task đã hoàn thành, đang thực hiện và chưa bắt đầu.

* Hiển thị danh sách công việc sắp đến hạn.

### B. Chức năng cộng điểm (không bắt buộc)

* Giao diện Kanban, kéo thả task giữa các trạng thái.

* Docker Compose để khởi chạy ứng dụng.

* Unit test hoặc integration test.

* Swagger/OpenAPI cho tài liệu API.

* CI pipeline chạy test khi push code.

* Deploy demo lên server hoặc nền tảng cloud.

## 3. Công nghệ đề xuất

- Ứng viên được thỏa sức chọn lựa công nghệ
- Gợi ý công nghệ có thể dùng ví dụ: nodejs, PHP/Laravel,...

## 4. Thiết kế database tham khảo

Ứng viên tự thiết kế sao cho đáp ứng nhu cầu đề bài
Yêu cầu: có migration tạo bảng, khóa ngoại và các ràng buộc dữ liệu phù hợp.

## 5. Sản phẩm ứng viên phải bàn giao

### Checklist bàn giao

- Pull Request tạo vào repo gốc
- README: hướng dẫn cài đặt và chạy dự án
- File .env.example, không chứa secret thật
- Database migration và dữ liệu mẫu/seed
- API documentation hoặc hướng dẫn sử dụng
- Danh sách chức năng đã hoàn thành và chức năng chưa hoàn thành
- Video demo 3–5 phút hoặc buổi demo trực tiếp

## 6. Setup and run

### 6.1 Quick start — Docker (recommended)

Requirements: **Docker with Compose v2**. Nothing else — no Node, no pnpm, no local PostgreSQL.

```bash
docker compose up
```

| Service | URL |
| ------- | --- |
| Frontend (nginx) | http://localhost:8080 |
| API | http://localhost:5004/api |
| API health | http://localhost:5004/api/health |
| pgAdmin (optional) | http://localhost:5050 — start with `docker compose --profile tools up -d` |

First boot runs in order: PostgreSQL (healthcheck-gated) → API container applies migrations, seeds sample data, then serves → nginx. Demo account: **demo@example.com / password123**.

Data lives in the named volume `postgres_data` and survives `docker compose down`. Only `docker compose down -v` destroys it.

### 6.2 With the Kong gateway (optional profile)

```bash
docker compose --profile gateway up
```

Kong on http://localhost:8000 becomes the single entry point — `/api` → `api:5004`, `/` → `web:8080` — with rate limiting (120 requests/minute) and CORS credentials enabled. The API still enforces auth itself, so every route also works without the gateway:

```text
API alone:    http://localhost:5004/api
Through Kong: http://localhost:8000/api
```

Note on browsing with the gateway on: the SPA bakes its API URL at build time (§6.4). The default build points at `http://localhost:5004/api`, so you can browse on `:8000` while API calls go direct to `:5004` (the CORS allow-list includes that origin). To push **all** browser traffic through Kong, rebuild with:

```bash
VITE_API_URL=http://localhost:8000/api docker compose --profile gateway up --build
```

…and then browse **http://localhost:8000**.

### 6.3 Common commands

| Action | Command |
| ------ | ------- |
| Start everything | `docker compose up` |
| Start with Kong | `docker compose --profile gateway up` |
| Reset the database | `docker compose down -v && docker compose up` |
| View logs | `docker compose logs -f api` |
| Run migrations | `docker compose exec api npx prisma migrate deploy` |
| Re-seed | `docker compose exec -e FORCE_SEED=1 api npx prisma db seed` |
| Rebuild after a code change | `docker compose up --build` |
| Shell into the API | `docker compose exec api sh` |

The seed **skips automatically** when the database already has users, so container restarts never wipe data. Re-seeding is explicit — the `FORCE_SEED=1` shown above drops and recreates the fixtures. `docker compose down` keeps the volume; only `down -v` resets it.

### 6.4 Vite build-time variable caveat

Vite inlines `VITE_*` variables when the image is **built**, not when the container starts. This is the most common source of "works locally, broken in Docker":

```bash
# Correct — the argument is baked into the bundle at build time:
docker build --build-arg VITE_API_URL=https://api.example.com ./frontend

# Wrong — setting it on the running container does nothing:
docker run -e VITE_API_URL=https://api.example.com ...   # too late
```

Same rule for `VITE_USE_MOCK_API`: the Docker image builds with `false` (real API); `frontend/.env.example` defaults it to `true` for mock-based host development.

### 6.5 Running locally without Docker

Prerequisites: Node 22+, pnpm 11.25 (`corepack enable`), PostgreSQL 16 — or reuse the compose one: `docker compose up -d postgres`.

Backend (`:5004`):

```bash
cd backend
cp .env.example .env        # defaults target the compose PostgreSQL on :5432
pnpm install
pnpm prisma migrate deploy
pnpm prisma:seed            # first run only; FORCE_SEED=1 pnpm prisma:seed to reset
pnpm dev
```

Frontend (`:5173`):

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5004/api
pnpm install
pnpm dev
```

Typechecks and tests:

```bash
cd backend && pnpm typecheck && pnpm test     # needs the todogit_test database (below)
cd frontend && pnpm typecheck && pnpm test
```

One-time test database, if it does not exist yet:

```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE todogit_test;"
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todogit_test?schema=public" pnpm exec prisma migrate deploy
```

Further documentation: [docs/api-data-format.md](docs/api-data-format.md) (API contract and frontend integration guide), [RENDER.md](RENDER.md) (cloud deployment), [CONTRIBUTING.md](CONTRIBUTING.md) (commit conventions).
