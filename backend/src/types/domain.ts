// Domain types shared by all three layers.
//
// They deliberately do NOT come from `@prisma/client`: the architecture rule
// (architecture-backend.md §3) keeps Prisma out of `service/`, and a plain
// structural type is all the layers need to agree on. The repository rows are
// structurally assignable to these — no conversion at the boundary.

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type IssueState = "open" | "closed";

/** A `Task` row as the repository returns it. Carries `userId`; DTOs must not. */
export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  userId: string;
  projectId: string | null;
  githubIssueNumber: number | null;
  githubState: IssueState | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The wire `Task` (api-data-format §5.2). `userId` is absent by construction. */
export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  projectId: string | null;
  githubIssueNumber: number | null;
  githubState: IssueState | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The reduced Dashboard row (api-data-format §5.3). */
export interface TaskSummaryDto {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  isOverdue: boolean;
  daysUntilDue: number;
}

/** A `Project` row as the repository returns it. Carries `userId`; DTOs must not. */
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  /** Stable per-user index, allocated max + 1 at creation, never reused. */
  projectNumber: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Task totals for one project, from a single `groupBy` (Phase 08 §5.1). */
export interface ProjectCounts {
  taskCount: number;
  completedTaskCount: number;
}

/** The wire `Project` (Phase 08 §5.1). `userId` is absent by construction. */
export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  projectNumber: number;
  taskCount: number;
  completedTaskCount: number;
  createdAt: Date;
}

/** A `GitHubRepository` row as the repository returns it. */
export interface GitHubRepositoryRow {
  id: string;
  githubId: bigint;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  visibility: "public" | "private";
  defaultBranch: string | null;
  url: string | null;
  projectId: string;
}

/** The wire `GitHubRepository` (Phase 11 §6.1). `githubId` serialises as a
 * string (§7.1) — GitHub IDs exceed 2^53 and must not round-trip as numbers. */
export interface GitHubRepositoryDto {
  githubId: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  visibility: "public" | "private";
  defaultBranch: string | null;
  url: string | null;
}

/** The wire issue (Phase 11 §6.4, SRS §10.3 fields). */
export interface GitHubIssueDto {
  number: number;
  title: string;
  body: string | null;
  state: IssueState;
  labels: string[];
  author: { login: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  displayName: string | null;
  githubId: string | null;
  githubLogin: string | null;
  githubAccessToken: string | null;
  /** Next project number to allocate; bumped on every project creation. */
  projectSeq: number;
  createdAt: Date;
  updatedAt: Date;
}

/** The signed-in user attached to a request by `requireAuth`. */
export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
}

/** The `User` resource (api-data-format §5.1) — never carries hash or token. */
export interface AuthUser extends SessionUser {
  createdAt: Date;
}

export interface DashboardSummary {
  total: number;
  byStatus: Record<TaskStatus, number>;
  overdue: number;
  dueToday: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
