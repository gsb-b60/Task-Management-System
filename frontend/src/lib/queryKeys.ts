import type { TaskStatus, TaskPriority } from '../api/types'

export const queryKeys = {
  tasks: (params: {
    q?: string
    status?: TaskStatus | TaskStatus[]
    priority?: TaskPriority | TaskPriority[]
    projectId?: string
    hasDueDate?: boolean
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }) => ['tasks', params] as const,

  task: (id: string) => ['task', { id }] as const,

  board: (params?: { projectId?: string; sortBy?: string; sortOrder?: string }) =>
    ['board', { projectId: params?.projectId, sortBy: params?.sortBy, sortOrder: params?.sortOrder }] as const,

  projects: () => ['projects'] as const,

  project: (id: string) => ['project', { id }] as const,

  dashboard: (projectId?: string) => ['dashboard', projectId ?? 'all'] as const,

  dashboardUpcoming: (params?: { projectId?: string; page?: number; pageSize?: number }) =>
    ['dashboard', 'upcoming', params] as const,

  githubRateLimit: () => ['github', 'rate-limit'] as const,
} as const