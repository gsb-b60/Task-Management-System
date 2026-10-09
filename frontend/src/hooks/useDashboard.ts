import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'

/**
 * Keyed by project and page so the switcher and the pager invalidate exactly
 * one slice rather than the whole dashboard cache.
 */
export function useDashboard(projectId?: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['dashboard', projectId ?? 'all', page, pageSize],
    queryFn: () => dataApi.dashboard.get({ projectId, page, pageSize }),
  })
}