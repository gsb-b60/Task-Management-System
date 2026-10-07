import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'

/**
 * Keyed by project so the switcher invalidates exactly one slice rather than
 * the whole dashboard cache.
 */
export function useDashboard(projectId?: string) {
  return useQuery({
    queryKey: ['dashboard', projectId ?? 'all'],
    queryFn: () => dataApi.dashboard.get({ projectId }),
  })
}