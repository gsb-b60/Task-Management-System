# Software Requirements Specification (SRS)

**Project:** Git Project Manager — Task Management System
**Type:** Mini Project · Backend / Fullstack Developer
**Version:** 1.0

---

## 1. Project Overview

### 1.1 Purpose

The system is a lightweight task-management application for personal or small-team use. It allows users to create, update, track, and manage their own work.

The application provides two main progress views:

1. **Board** — GitHub-style Kanban board for task progress.
2. **Roadmap** — GitHub-style roadmap/timeline view for project planning.

### 1.2 Main Goal

The application should allow a user to:

```text
Register / Login
        ↓
Create a project (optionally linked to a GitHub repository)
        ↓
Create / view / update / delete tasks
        ↓
Search and filter tasks by title, status, priority
        ↓
Review progress on the Dashboard
        ↓
Move work through:
TODO → IN PROGRESS → DONE
        ↓
View project progress through Board / Roadmap
```

### 1.3 Requirement Traceability

| Origin Brief Clause | SRS Section | Requirement IDs |
| ------------------- | ----------- | --------------- |
| A.1 Quản lý tài khoản | §3, §14 | FR-01 – FR-05 |
| A.2 Task CRUD | §5, §8, §14 | FR-06 – FR-11 |
| A.3 Tìm kiếm và lọc | §6, §14 | FR-12 – FR-15 |
| A.4 Dashboard | §7, §14 | FR-16 – FR-19 |
| B Chức năng cộng điểm | §9 – §11, §16 | FR-20 – FR-30 |
| 4. Thiết kế database | §17 | NFR-DB |
| 5. Sản phẩm bàn giao | §18 | DL-01 – DL-07 |

---

## 2. Scope

### 2.1 In Scope — Mandatory (MVP)

- User registration
- User login / logout
- Secure password hashing
- Per-user data isolation
- Task CRUD (create, read, update, delete)
- Task attributes: title, description, status, priority, start date, due date
- Task status model: `TODO`, `IN_PROGRESS`, `DONE`
- Search tasks by title
- Filter tasks by status
- Filter tasks by priority
- Pagination for task lists
- Dashboard with task statistics
- Dashboard list of upcoming due tasks
- REST API
- Database migrations with foreign keys and constraints
- Seed/sample data
- README with installation and run instructions

### 2.2 In Scope — Bonus

- Kanban board with drag-and-drop between statuses
- Docker Compose development environment
- Unit and integration tests
- Swagger / OpenAPI API documentation
- CI pipeline running tests on push
- Demo deployment to a cloud platform
- GitHub OAuth authentication
- GitHub repository selection
- GitHub issue listing and association
- Roadmap / timeline view
- API Gateway using Kong

### 2.3 Out of Scope

The MVP will **not** implement:

- Git clone / push / pull
- GitHub pull-request management
- GitHub Actions management
- Commit management
- Branch management
- Code review
- Team chat
- File storage
- Full GitHub repository management
- GitHub organization administration

---

## 3. Account Management

> **Priority: Mandatory (MVP)**

### 3.1 Registration

Users shall be able to create an account with:

- Email address (must be a valid, unique email format)
- Password (minimum 8 characters)
- Display name (optional)

Upon successful registration the user is authenticated and an application session is created.

### 3.2 Login

```text
User submits email + password
        ↓
Backend verifies credentials
        ↓
Password compared against stored hash
        ↓
Match?  ── no ──▶ 401 Unauthorized
  │ yes
  ▼
Session created
```

### 3.3 Logout

Users shall be able to end their session. After logout, the session token or cookie is invalidated and protected routes return `401 Unauthorized`.

### 3.4 Requirements

- User can register an account.
- User can log in and log out.
- Passwords must be hashed with a modern algorithm (bcrypt, scrypt, or Argon2) — never stored in plaintext.
- Duplicate email registration must be rejected with a clear error.
- Invalid login credentials must return an appropriate error message without revealing which field was wrong.
- Users may only access data belonging to them.

---

## 4. GitHub Authentication

> **Priority: Bonus**

Users may authenticate using GitHub OAuth instead of, or in addition to, email/password.

### 4.1 Flow

```text
User
  ↓
Login with GitHub
  ↓
GitHub Authorization
  ↓
GitHub Callback
  ↓
Backend exchanges authorization code
  ↓
User authenticated
  ↓
Application session created
```

### 4.2 Requirements

- User can log in using GitHub.
- User does not need a separate application password.
- Application retrieves basic GitHub profile information.
- Application retrieves an access token required for GitHub API operations.
- Authentication failures must return an appropriate error message.
- Protected application APIs require an authenticated user.

---

## 5. Task Management

> **Priority: Mandatory (MVP)**

### 5.1 Task Attributes

Each task shall contain:

| Attribute      | Type       | Required | Notes                              |
| -------------- | ---------- | -------- | ---------------------------------- |
| `id`           | UUID       | Yes      | System-generated                   |
| `title`        | String     | Yes      | Non-empty, max 200 chars           |
| `description`  | String     | No       | Markdown or plain text             |
| `status`       | Enum       | Yes      | `TODO` \| `IN_PROGRESS` \| `DONE`  |
| `priority`     | Enum       | Yes      | `LOW` \| `MEDIUM` \| `HIGH`        |
| `startDate`    | DateTime   | No       | Used by Roadmap                    |
| `dueDate`      | DateTime   | No       | Used by Dashboard and Roadmap      |
| `createdAt`    | DateTime   | Yes      | System-generated                   |
| `updatedAt`    | DateTime   | Yes      | System-generated                   |
| `userId`       | UUID       | Yes      | Owner of the task                  |

### 5.2 CRUD Operations

- **Create** — user creates a task; `status` defaults to `TODO` if omitted.
- **Read** — user views a single task or a list of their own tasks.
- **Update** — user edits any mutable attribute, including `status`.
- **Delete** — user deletes a task they own.

### 5.3 Validation

- `title` must not be empty.
- `dueDate` must not be earlier than `startDate`.
- `status` and `priority` must be one of the allowed enum values.
- Invalid input must return `400 Bad Request` with a field-level error message.

---

## 6. Search, Filter & Pagination

> **Priority: Mandatory (MVP)**

### 6.1 Search

Users can search their tasks by **title**. The search shall be case-insensitive and match partial titles.

```text
Search: "login"
Matches: "Fix login redirect", "Login page rewrite", "Add logout button"
```

### 6.2 Filter

Users can filter their task list by:

- `status` — one or more of `TODO`, `IN_PROGRESS`, `DONE`
- `priority` — one or more of `LOW`, `MEDIUM`, `HIGH`

Filters shall be combinable with each other and with the search query.

### 6.3 Pagination

Task lists shall be paginated to support large datasets.

| Parameter      | Type    | Default | Description                       |
| -------------- | ------- | ------- | --------------------------------- |
| `page`         | Integer | `1`     | 1-indexed page number             |
| `pageSize`     | Integer | `20`    | Items per page (max `100`)        |
| `sortBy`       | String  | `dueDate` | Sort field                      |
| `sortOrder`    | String  | `asc`   | `asc` \| `desc`                   |

Every paginated response must include metadata:

```json
{
  "data": [ /* ... */ ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 137,
    "totalPages": 7
  }
}
```

---

## 7. Dashboard

> **Priority: Mandatory (MVP)**

### 7.1 Statistics

The Dashboard shall display, scoped to the signed-in user:

- **Total tasks**
- **Completed tasks** (`DONE`)
- **In progress** (`IN_PROGRESS`)
- **Not started** (`TODO`)

### 7.2 Upcoming Due Tasks

The Dashboard shall list tasks approaching or past their `dueDate`, ordered by nearest due date first. Overdue tasks must be visually distinguished.

```text
Dashboard
──────────────────────────────
Total: 137   Done: 48   Doing: 52   Todo: 37

Upcoming
──────────────────────────────
⚠ #12 Fix login redirect    due tomorrow
⚠ #18 Deploy staging         due today
  #21 Write API docs         due in 5 days
  #24 Refactor auth          due in 9 days
```

---

## 8. Task Status

> **Priority: Mandatory (MVP)**

Every task displayed in the project board shall have a progress status:

```text
TODO
IN_PROGRESS
DONE
```

Default status:

```text
TODO
```

For GitHub issues, the application may maintain its own project status independently from the GitHub issue's `open/closed` state.

Example:

```text
GitHub:
Issue #42 = OPEN

Application:
Issue #42 = IN_PROGRESS
```

This prevents GitHub's issue state from being incorrectly treated as the application's Kanban state.

---

## 9. Kanban Board

> **Priority: Bonus**

### 9.1 Board Screen

```text
┌──────────────┬──────────────────┬──────────────┐
│     TODO     │   IN PROGRESS    │     DONE     │
├──────────────┼──────────────────┼──────────────┤
│ #21 Login    │ #18 API Gateway  │ #15 Database │
│ #22 UI       │ #19 OAuth        │ #16 Docker   │
│ #23 Testing  │                  │              │
└──────────────┴──────────────────┴──────────────┘
```

### 9.2 Drag and Drop

```text
TODO
  ↓ drag
IN_PROGRESS
  ↓ drag
DONE
```

The backend must persist the new status.

### 9.3 Board Requirements

- Tasks can be dragged between columns.
- Status is persisted after movement.
- Board refresh must preserve task status.
- Failed status updates must not silently lose the previous state.
- Board should support both local tasks and GitHub-associated issues.

---

## 10. Repository & GitHub Issues

> **Priority: Bonus**

### 10.1 Repository Selection

After authentication, the user can view repositories available through their GitHub account.

The repository list should contain:

- Repository name
- Owner
- Description
- Visibility
- Default branch
- Repository URL

The user can select one repository as the project's GitHub repository.

### 10.2 Repository Project

```text
GitHub Repository
      ↓
Application Project
      ↓
GitHub Issues
      ↓
Board / Roadmap
```

The application should associate the project with:

```text
GitHub Owner
GitHub Repository
GitHub Repository ID
Repository URL
```

### 10.3 GitHub Issues

If a project is associated with a GitHub repository, the application shall display the repository's GitHub issues.

The issue list should contain:

- Issue number
- Title
- Description/body
- State
- Labels
- Author
- Created date
- Updated date

Example:

```text
#24 Fix login redirect
#25 Improve mobile layout
#26 Add repository filtering
```

---

## 11. Roadmap

> **Priority: Bonus**

The roadmap is a GitHub-inspired timeline view displaying tasks against time.

```text
             OCTOBER                 NOVEMBER

Authentication ──────────────────●
Repository                         ├────────────────●
Issue System                       ├─────────────────────●
Kanban                             ├────────────●
Testing                                        ├──────●
Deployment                                    ├────────●
```

Tasks can have:

- Start date
- Due date
- Status
- Priority

### 11.1 Purpose

The roadmap is used for higher-level planning, while the Kanban board is used for day-to-day progress.

```text
Board
  = What am I working on now?

Roadmap
  = Where is the project going?
```

---

## 12. Project Creation

### 12.1 Create Local Project

Users can create a project without connecting a GitHub repository.

**Required:**

- Project name

**Optional:**

- Description
- Start date
- Target date

Example:

```text
Create Project

Name:
Git Project Manager

Description:
Personal project-management application

GitHub Repository:
None
```

The user can immediately create tasks in the project.

### 12.2 Create Repository-Based Project

The user can select:

```text
GitHub
  → Repository
  → Create Project
```

The selected repository becomes associated with the project.

---

## 13. Main Screens

### 13.1 Register

```text
Git Project Manager

Name:      [________________]

Email:     [________________]

Password:  [________________]

[ Create Account ]

Already have an account? Log in
```

### 13.2 Login

```text
Git Project Manager

Email:     [________________]

Password:  [________________]

[ Log In ]

[ Continue with GitHub ]
```

### 13.3 Dashboard

```text
Dashboard
──────────────────────────────
Total: 137    Done: 48    Doing: 52    Todo: 37

Upcoming
──────────────────────────────
⚠ #12 Fix login redirect     due tomorrow
  #21 Write API docs          due in 5 days

[ Go to Board ]  [ Go to Roadmap ]
```

### 13.4 Task List

```text
My Tasks

[ Search by title…            ]
[ Status: All ▾ ] [ Priority: All ▾ ]

──────────────────────────────
□ #12  Fix login redirect   HIGH    IN PROGRESS
□ #18  Deploy staging       MEDIUM  TODO
□ #24  Refactor auth        LOW     DONE

◀ 1  2  3 ▶     Page 1 of 7
```

### 13.5 Project Selection

```text
My Projects

[ Create Project ]

GitHub Repositories
────────────────────
owner/repo-1
owner/repo-2
owner/repo-3
```

### 13.6 Board

```text
Project: My Repository

[ Board ]  [ Roadmap ]

TODO          IN PROGRESS       DONE
────          ───────────       ────
Issue #1      Issue #3          Issue #2
Task #4       Task #5           Task #6
```

### 13.7 Roadmap

```text
Project Roadmap

        Oct        Nov        Dec

Auth    ███████
Issues           █████████
Board                       ██████
Deploy                         ███████
```

### 13.8 Task Detail

```text
Title
Description

Status
Priority
Start Date
Due Date

[ Save ]  [ Delete ]
```

---

## 14. Functional Requirements

**Priority:** `Must` = Mandatory (MVP) · `Bonus` = Optional scoring features

| ID    | Requirement                                              | Priority |
| ----- | -------------------------------------------------------- | -------- |
| FR-01 | User can register an account                              | Must     |
| FR-02 | User can log in                                          | Must     |
| FR-03 | User can log out                                         | Must     |
| FR-04 | Passwords are stored hashed, never in plaintext           | Must     |
| FR-05 | User can only access their own projects and tasks         | Must     |
| FR-06 | User can create a task                                    | Must     |
| FR-07 | User can view a task                                      | Must     |
| FR-08 | User can edit a task                                      | Must     |
| FR-09 | User can delete a task                                    | Must     |
| FR-10 | Task has title, description, status, priority, due date   | Must     |
| FR-11 | Task status is one of `TODO`/`IN_PROGRESS`/`DONE`         | Must     |
| FR-12 | User can search tasks by title                            | Must     |
| FR-13 | User can filter tasks by status                           | Must     |
| FR-14 | User can filter tasks by priority                         | Must     |
| FR-15 | Task lists are paginated                                  | Must     |
| FR-16 | Dashboard shows total task count                          | Must     |
| FR-17 | Dashboard shows count of completed tasks                  | Must     |
| FR-18 | Dashboard shows count of in-progress tasks                | Must     |
| FR-19 | Dashboard shows count of not-started tasks                | Must     |
| FR-20 | Dashboard lists tasks approaching their due date          | Must     |
| FR-21 | User can drag tasks between board columns                 | Bonus     |
| FR-22 | Board persists task status after movement                 | Bonus     |
| FR-23 | User can authenticate with GitHub                        | Bonus     |
| FR-24 | User can view and select a GitHub repository              | Bonus     |
| FR-25 | User can view repository issues and their metadata       | Bonus     |
| FR-26 | Project can be associated with a GitHub repository        | Bonus     |
| FR-27 | User can view the project roadmap                         | Bonus     |
| FR-28 | Application runs via Docker Compose                       | Bonus     |
| FR-29 | API is documented with Swagger / OpenAPI                  | Bonus     |
| FR-30 | CI pipeline runs tests on push                            | Bonus     |

---

## 15. Non-Functional Requirements

### Performance

- Normal API requests should respond within approximately 500 ms under normal conditions.
- Task lists must be paginated so response size stays bounded regardless of dataset size.
- Board interactions should feel immediate to the user.
- GitHub API requests should handle GitHub rate limits gracefully.

### Security

- Passwords must be hashed with a salted, modern algorithm (bcrypt/Argon2).
- GitHub OAuth credentials must remain server-side.
- GitHub access tokens must not be exposed to the browser unnecessarily.
- Authentication endpoints must be protected against abuse.
- API requests must validate authenticated users.
- Users must only access projects and tasks belonging to them.
- All user input must be validated and parameterised queries used to prevent injection.

### Reliability

- Failed database operations must return appropriate errors.
- GitHub API failures must not crash the application.
- External API failures should provide meaningful feedback.

### Testability

- Core business logic shall be covered by unit tests.
- Critical API flows shall be covered by integration tests.
- Tests must be runnable locally via a single documented command.

### Scalability

- Database indexes required on `userId`, `status`, `priority`, and `dueDate`.
- Pagination caps enforced (`pageSize` max 100).
- Migrations must be reversible where the ORM supports it.

---

## 16. Technology Stack

### Frontend

```text
React
TypeScript
```

Responsibilities:

- Authentication UI (register / login / logout)
- Dashboard UI
- Task list with search, filter, pagination
- Repository selection
- Board
- Drag and drop
- Roadmap

### Backend

```text
Node.js
TypeScript
```

Responsibilities:

- REST API
- Authentication / session management
- Password hashing
- Search, filtering, pagination
- GitHub OAuth
- GitHub API integration
- Project management
- Task management

### Database

```text
PostgreSQL
Prisma
```

### Testing

```text
Vitest / Jest        — unit tests
Supertest            — integration tests
```

### API Documentation

```text
Swagger / OpenAPI 3.0
```

Exposed at a documented path (e.g. `/api/docs`).

### Containerization

```text
Docker
Docker Compose
```

Development environment:

```text
React
Node API
PostgreSQL
Kong (optional)
```

### Continuous Integration

```text
GitHub Actions
   ↓ on push / pull request
Install → Lint → Migrate → Test → Build
```

### Deployment

```text
Render
```

Deployment includes:

```text
Frontend
Backend
PostgreSQL
```

Kong can initially be used locally through Docker Compose. Production deployment can be added after the core application works.

---

## 17. Database Design

### 17.1 Entities

```text
User
Project
Task
GitHubRepository (optional)
```

### 17.2 Relationship

```text
User
└── Project
     ├── GitHubRepository (optional)
     └── Task
```

### 17.3 Constraints

The schema shall include:

- Foreign keys with referential actions (`CASCADE` on user deletion)
- `NOT NULL` on required fields (`title`, `status`, `priority`, `userId`)
- Indexes on `userId`, `status`, `priority`, `dueDate`
- A check constraint or enum restricting `status` to `TODO` / `IN_PROGRESS` / `DONE`
- A check constraint ensuring `dueDate >= startDate` when both are set

### 17.4 Migrations & Seed

- All schema changes shall be delivered as versioned migrations.
- Seed data shall be provided so a fresh install runs with realistic sample tasks.
- Migrations and seed must run via a single documented command.

---

## 18. Deliverables Checklist

- [ ] **DL-01** Pull Request opened against the original repository
- [ ] **DL-02** README with installation and run instructions
- [ ] **DL-03** `.env.example` file containing no real secrets
- [ ] **DL-04** Database migrations and seed/sample data
- [ ] **DL-05** API documentation (Swagger / OpenAPI) or usage guide
- [ ] **DL-06** List of completed features and features not completed
- [ ] **DL-07** 3–5 minute demo video, or a live demo session

---

## 19. MVP Development Order

The project shall be implemented incrementally, mandatory scope first.

### Milestone 1 — Accounts

```text
Register
  ↓
Login
  ↓
Logout
  ↓
Password hashing + session
```

### Milestone 2 — Task CRUD

```text
Create task
  ↓
Read task
  ↓
Edit / delete task
  ↓
Status & priority model
```

### Milestone 3 — Search, Filter & Pagination

```text
Search by title
  ↓
Filter by status
  ↓
Filter by priority
  ↓
Paginated responses
```

### Milestone 4 — Dashboard

```text
Total / Done / Doing / Todo counts
  ↓
Upcoming due tasks list
```

### Milestone 5 — Kanban Board *(Bonus)*

```text
TODO
IN_PROGRESS
DONE

+ drag-and-drop and persistence
```

### Milestone 6 — GitHub Integration *(Bonus)*

```text
Authenticated user
  ↓
List repositories
  ↓
Select repository
  ↓
List issues
```

### Milestone 7 — Roadmap *(Bonus)*

Task dates and timeline visualization.

### Milestone 8 — Engineering Quality *(Bonus)*

```text
Docker Compose
  ↓
Unit / integration tests
  ↓
Swagger / OpenAPI
  ↓
CI pipeline on push
```

### Milestone 9 — Deployment *(Bonus)*

```text
Deploy
  ↓
Demo + documentation
  ↓
Pull Request
```

---

## 20. MVP Success Criteria

The MVP is considered complete when a new user can:

```text
1. Register an account
       ↓
2. Log in
       ↓
3. Create a project
       ↓
4. Create, edit, and delete a task
       ↓
5. Move a task:
   TODO → IN_PROGRESS → DONE
       ↓
6. Search tasks by title
       ↓
7. Filter tasks by status and priority
       ↓
8. Page through the task list
       ↓
9. View dashboard totals and upcoming due tasks
```

Bonus criteria:

```text
- Drag tasks across Kanban columns with persistence
- Log in with GitHub, pick a repository, and see its issues
- View progress on the Roadmap
- Run the whole stack with Docker Compose
- Have tests, Swagger, and CI in place
- Access a live demo deployment
```

The resulting application is therefore a **task management tool with GitHub integration**, rather than a GitHub replacement.