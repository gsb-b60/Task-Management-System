import { fetchAuthApi } from './auth'
import { fetchTasksApi } from './tasks'
import { fetchProjectsApi } from './projects'
import { fetchDashboardApi } from './dashboard'
import { fetchGitHubApi } from './github'

export const authApi = fetchAuthApi

export const dataApi = {
  tasks: fetchTasksApi,
  projects: fetchProjectsApi,
  dashboard: fetchDashboardApi,
  github: fetchGitHubApi,
}

export { isApiError, ApiError, setUnauthorizedHandler, apiUrl } from './client'
export type {
  AuthApi,
  DashboardApi,
  GitHubApi,
  LoginInput,
  ProjectsApi,
  RegisterInput,
  TasksApi,
} from './auth'
export type {
  ApiErrorCode,
  ApiErrorDetail,
  DashboardResponse,
  DashboardStats,
  Paginated,
  PaginationMeta,
  Project,
  ProjectListItem,
  Task,
  TaskPriority,
  TaskStatus,
  User,
  GitHubRateLimit,
} from './types'