import { apiUrl, request } from './client'
import type { User } from './types'
import type { DashboardResponse, Paginated, ProjectListItem, Task, TaskStatus, TaskPriority } from './types'

/**
 * The auth contract. Both the fetch implementation and the mock layer
 * satisfy it, and `AuthContext` depends only on this interface — which is
 * what lets component tests inject a mock with no network involved.
 */
export interface AuthApi {
  register(input: RegisterInput): Promise<User>
  login(input: LoginInput): Promise<User>
  logout(): Promise<void>
  me(): Promise<User>
  /** Full URL the browser follows to reach GitHub's consent screen. */
  githubAuthorizeUrl(): string
}

export interface RegisterInput {
  email: string
  password: string
  displayName?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface DashboardApi {
  get(params?: { projectId?: string }): Promise<DashboardResponse>
}

export interface TasksApi {
  list(params?: {
    projectId?: string
    q?: string
    status?: TaskStatus | TaskStatus[]
    priority?: TaskPriority | TaskPriority[]
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<Paginated<Task>>
  get(id: string): Promise<Task>
  create(input: {
    title: string
    description?: string | null
    status?: TaskStatus
    priority?: TaskPriority
    startDate?: string | null
    dueDate?: string | null
    projectId?: string | null
  }): Promise<Task>
  update(id: string, input: {
    title?: string
    description?: string | null
    status?: TaskStatus
    priority?: TaskPriority
    startDate?: string | null
    dueDate?: string | null
    projectId?: string | null
  }): Promise<Task>
  delete(id: string): Promise<void>
}

export interface ProjectsApi {
  list(): Promise<ProjectListItem[]>
  get(id: string): Promise<ProjectListItem>
  create(input: {
    name: string
    description?: string | null
    startDate?: string | null
    targetDate?: string | null
  }): Promise<ProjectListItem>
  update(id: string, input: {
    name?: string
    description?: string | null
    startDate?: string | null
    targetDate?: string | null
  }): Promise<ProjectListItem>
  delete(id: string): Promise<void>
}

export interface GitHubApi {
  rateLimit(): Promise<import('./types').GitHubRateLimit | null>
}

export interface DataApi {
  dashboard: DashboardApi
  tasks: TasksApi
  projects: ProjectsApi
  github: GitHubApi
}

export const fetchAuthApi: AuthApi = {
  async register(input) {
    return request<User>('/auth/register', { method: 'POST', body: input })
  },

  async login(input) {
    return request<User>('/auth/login', { method: 'POST', body: input })
  },

  async logout() {
    await request<void>('/auth/logout', { method: 'POST' })
  },

  async me() {
    // A 401 here means "no session", which is a normal state.
    return request<User>('/auth/me', { expectUnauthenticated: true })
  },

  githubAuthorizeUrl() {
    return apiUrl('/auth/github')
  },
}