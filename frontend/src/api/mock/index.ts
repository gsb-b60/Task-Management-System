import type { DataApi } from '../auth'
import { mockDashboardApi, mockGitHubApi, mockProjectsApi, mockTasksApi } from './data'

export const mockDataApi: DataApi = {
  dashboard: mockDashboardApi,
  tasks: mockTasksApi,
  projects: mockProjectsApi,
  github: mockGitHubApi,
}

export { mockAuthApi, seedSession, clearSession } from './auth'
export { mockDashboardApi, mockTasksApi, mockProjectsApi, mockGitHubApi } from './data'
export { resetDb, getDb, DEMO_EMAIL, DEMO_PASSWORD } from './db'
export { setMockLatency, setScenario } from './overrides'
export type { MockScenario } from './overrides'