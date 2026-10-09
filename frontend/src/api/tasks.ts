import { ApiError, request, requestJson } from './client'
import type { Task, Paginated, TaskStatus, TaskPriority } from './types'

export interface TasksApi {
  list(params?: {
    projectId?: string
    q?: string
    status?: TaskStatus | TaskStatus[]
    priority?: TaskPriority | TaskPriority[]
    hasDueDate?: boolean
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

function queryString(params: Record<string, string | number | string[] | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length > 0) search.set(key, value.join(','))
    } else {
      search.set(key, String(value))
    }
  }
  const serialised = search.toString()
  return serialised ? `?${serialised}` : ''
}

function isTaskPage(value: unknown): value is Paginated<Task> {
  if (typeof value !== 'object' || value === null) return false
  const page = value as { data?: unknown; meta?: unknown }
  return Array.isArray(page.data) && typeof page.meta === 'object' && page.meta !== null
}

export const fetchTasksApi: TasksApi = {
  async list(params) {
    const payload = await requestJson(
      `/tasks${queryString({
        projectId: params?.projectId,
        q: params?.q,
        status: params?.status,
        priority: params?.priority,
        hasDueDate: params?.hasDueDate,
        page: params?.page,
        pageSize: params?.pageSize,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      })}`,
    )
    // List endpoints return a bare `{ data, meta }` page, not the `{ data }`
    // envelope — the unwrapping `request` would hand back the bare rows array,
    // so every consumer would see `.data` as undefined and `.meta` as missing.
    if (!isTaskPage(payload)) {
      throw new ApiError('INTERNAL_ERROR', 'Unexpected tasks response.', 200)
    }
    return payload
  },

  async get(id) {
    return request<Task>(`/tasks/${id}`)
  },

  async create(input) {
    return request<Task>('/tasks', { method: 'POST', body: input })
  },

  async update(id, input) {
    return request<Task>(`/tasks/${id}`, { method: 'PATCH', body: input })
  },

  async delete(id) {
    await request<void>(`/tasks/${id}`, { method: 'DELETE' })
  },
}