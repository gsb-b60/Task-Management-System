import { apiUrl, request } from './client'
import type { DashboardResponse, Paginated, ProjectListItem, Task, User } from './types'

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
    status?: string
    priority?: string
    page?: number
    pageSize?: number
  }): Promise<Paginated<Task>>
}

export interface ProjectsApi {
  list(): Promise<ProjectListItem[]>
}

export interface GitHubRateLimit {
  remaining: number
  limit: number
}

export interface GitHubApi {
  /**
   * `null` when the quota is not knowable. The API only surfaces
   * `x-ratelimit-remaining` per response until Phase 11 exposes it, so the
   * shell hides the counter rather than inventing a number.
   */
  rateLimit(): Promise<GitHubRateLimit | null>
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

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const serialised = search.toString()
  return serialised ? `?${serialised}` : ''
}

export const fetchDataApi: DataApi = {
  dashboard: {
    async get(params) {
      return request<DashboardResponse>(`/dashboard${queryString({ projectId: params?.projectId })}`)
    },
  },

  tasks: {
    async list(params) {
      return request<Paginated<Task>>(
        `/tasks${queryString({
          projectId: params?.projectId,
          q: params?.q,
          status: params?.status,
          priority: params?.priority,
          page: params?.page,
          pageSize: params?.pageSize,
        })}`,
      )
    },
  },

  projects: {
    async list() {
      return request<ProjectListItem[]>('/projects')
    },
  },

  github: {
    async rateLimit() {
      // Phase 11 exposes the quota; until then it is genuinely unknown.
      return null
    },
  },
}