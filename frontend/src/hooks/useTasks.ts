import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'
import type { TaskStatus, TaskPriority } from '../api/types'
import { useDebouncedValue } from '../lib/useDebouncedValue'

export function useTasks() {
  const [searchParams] = useSearchParams()

  const projectId = searchParams.get('projectId') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const statusParam = searchParams.get('status')
  const priorityParam = searchParams.get('priority')
  const page = Number(searchParams.get('page') ?? '1')
  // Fixed page size — no per-page selector in the UI.
  const pageSize = 20
  const sortBy = searchParams.get('sortBy') ?? 'dueDate'
  const sortOrder = searchParams.get('sortOrder') ?? 'asc'

  const status = statusParam ? statusParam.split(',') as TaskStatus[] : undefined
  const priority = priorityParam ? priorityParam.split(',') as TaskPriority[] : undefined

  const debouncedQ = useDebouncedValue(q, 300)

  return useQuery({
    queryKey: queryKeys.tasks({
      projectId,
      q: debouncedQ,
      status,
      priority,
      page,
      pageSize,
      sortBy,
      sortOrder,
    }),
    queryFn: () =>
      dataApi.tasks.list({
        projectId,
        q: debouncedQ,
        status,
        priority,
        page,
        pageSize,
        sortBy,
        sortOrder,
      }),
  })
}