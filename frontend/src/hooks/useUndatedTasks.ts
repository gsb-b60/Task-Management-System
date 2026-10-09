import { useQuery } from '@tanstack/react-query'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'

/**
 * Unfinished tasks without a due date — the sibling the Upcoming panel never
 * shows. Newest first so a just-created task lands on top. Keyed under
 * `['tasks', …]` so task mutations invalidate it with everything else.
 */
export function useUndatedTasks(projectId?: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: queryKeys.tasks({
      projectId,
      status: ['TODO', 'IN_PROGRESS'],
      hasDueDate: false,
      page,
      pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    queryFn: () =>
      dataApi.tasks.list({
        projectId,
        status: ['TODO', 'IN_PROGRESS'],
        hasDueDate: false,
        page,
        pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  })
}
