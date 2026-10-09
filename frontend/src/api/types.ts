/**
 * Wire types mirrored from docs/api-data-format.md. The server is the
 * authority on every shape here — this file must never invent a field the
 * API does not send.
 */

/** Stable, machine-readable error codes (api-data-format §4.5). */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'GITHUB_NOT_LINKED'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UPSTREAM_ERROR'

export interface ApiErrorDetail {
  /** Dotted path for nested fields. `null` for whole-body problems. */
  field: string | null
  message: string
}

export interface User {
  id: string
  email: string
  displayName?: string | null
  createdAt?: string
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Task {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  /** Date-only value, `YYYY-MM-DD`. Parse as local, never `new Date()`. */
  dueDate?: string | null
  startDate?: string | null
  /** Computed server-side. A client clock in another timezone disagrees. */
  isOverdue: boolean
  daysUntilDue: number | null
  projectId: string | null
  githubIssueNumber: number | null
  githubState: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskSummary {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  isOverdue: boolean
  daysUntilDue: number | null
}

export interface Project {
  id: string
  name: string
  description?: string | null
  startDate?: string | null
  targetDate?: string | null
  color?: string | null
  createdAt: string
}

export interface ProjectListItem {
  id: string
  name: string
  description?: string | null
  startDate?: string | null
  targetDate?: string | null
  color?: string | null
  taskCount: number
  completedTaskCount: number
  repository?: {
    githubId: string
    fullName: string
    isPrivate: boolean
  } | null
  createdAt: string
}

export interface DashboardStats {
  total: number
  byStatus: Record<TaskStatus, number>
  overdue: number
  dueToday: number
}

/**
 * Absent status keys render `0`, never blank, so a stat tile always shows a
 * number. The mock layer and the real API both fill every key.
 */
export interface DashboardResponse {
  stats: DashboardStats
  upcoming: TaskSummary[]
  /** Page of the upcoming list — the server caps it, so this is required. */
  meta: PaginationMeta
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface GitHubRateLimit {
  remaining: number
  /** Null when the server did not expose the quota ceiling (see CORS). */
  limit: number | null
}