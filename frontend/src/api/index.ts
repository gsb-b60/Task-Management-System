import { fetchAuthApi, fetchDataApi } from './auth'
import type { DataApi } from './auth'
import { mockAuthApi, mockDataApi } from './mock'

/**
 * The backend is still an empty scaffold (Phase 00 has not landed), so mocks
 * are the default and the app runs end to end. Set `VITE_USE_MOCK_API=false`
 * once the API is up and every call goes through `fetch` instead.
 */
const useMocks = import.meta.env.VITE_USE_MOCK_API !== 'false'

export const authApi = useMocks ? mockAuthApi : fetchAuthApi
export const dataApi: DataApi = useMocks ? mockDataApi : fetchDataApi

export { isApiError, ApiError, setUnauthorizedHandler, apiUrl } from './client'
export type {
  AuthApi,
  DashboardApi,
  DataApi,
  GitHubApi,
  GitHubRateLimit,
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
} from './types'