import { request } from './client'
import type { DashboardResponse, DashboardStats, TaskSummary } from './types'

export interface DashboardApi {
  get(params?: { projectId?: string }): Promise<DashboardResponse>
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

export const fetchDashboardApi: DashboardApi = {
  async get(params) {
    const query = queryString({ projectId: params?.projectId })
    const [stats, upcoming] = await Promise.all([
      request<DashboardStats>(`/dashboard/summary${query}`),
      request<TaskSummary[]>(`/dashboard/upcoming${query}`),
    ])
    return { stats, upcoming }
  },
}