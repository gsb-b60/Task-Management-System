import { ApiError, request, requestJson } from './client'
import type { DashboardResponse, DashboardStats, Paginated, TaskSummary } from './types'

export interface DashboardApi {
  get(params?: { projectId?: string; page?: number; pageSize?: number }): Promise<DashboardResponse>
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

function isUpcomingPage(value: unknown): value is Paginated<TaskSummary> {
  if (typeof value !== 'object' || value === null) return false
  const page = value as { data?: unknown; meta?: unknown }
  return Array.isArray(page.data) && typeof page.meta === 'object' && page.meta !== null
}

export const fetchDashboardApi: DashboardApi = {
  async get(params) {
    const summaryQuery = queryString({ projectId: params?.projectId })
    const upcomingQuery = queryString({
      projectId: params?.projectId,
      page: params?.page,
      pageSize: params?.pageSize,
    })
    const [stats, upcomingPayload] = await Promise.all([
      request<DashboardStats>(`/dashboard/summary${summaryQuery}`),
      requestJson(`/dashboard/upcoming${upcomingQuery}`),
    ])
    // `{ data, meta }` must not go through the unwrapping `request`: the
    // pagination meta would be silently dropped and only page 1 ever shown.
    if (!isUpcomingPage(upcomingPayload)) {
      throw new ApiError('INTERNAL_ERROR', 'Unexpected dashboard response.', 200)
    }
    return { stats, upcoming: upcomingPayload.data, meta: upcomingPayload.meta }
  },
}