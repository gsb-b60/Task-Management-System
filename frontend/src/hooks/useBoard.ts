import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'
import { toast } from 'sonner'
import type { Task, TaskStatus } from '../api/types'

interface UseBoardOptions {
  projectId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface BoardData {
  data: Task[]
  meta: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function useBoard({ projectId, sortBy = 'dueDate', sortOrder = 'asc' }: UseBoardOptions = {}) {
  const queryClient = useQueryClient()

  const queryKey = queryKeys.board({ projectId, sortBy, sortOrder })

  const { data, isPending, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      dataApi.tasks.list({
        projectId,
        status: ['TODO', 'IN_PROGRESS', 'DONE'],
        page: 1,
        pageSize: 100,
        sortBy,
        sortOrder,
      }),
  })

  const moveTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      dataApi.tasks.update(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey })
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      const previousBoard = queryClient.getQueryData<BoardData>(queryKey)
      const previousTasks = queryClient.getQueriesData<BoardData>({ queryKey: ['tasks'] })

      if (previousBoard) {
        queryClient.setQueryData<BoardData>(queryKey, (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((task) =>
              task.id === taskId ? { ...task, status } : task,
            ),
          }
        })
      }

      return { previousBoard, previousTasks }
    },
    onError: (error, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(queryKey, context.previousBoard)
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
      toast.error(`Failed to move task: ${error.message}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const tasks = data?.data ?? []
  const meta = data?.meta ?? {
    page: 1,
    pageSize: 100,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  }

  // The server returns rows in the requested order; columns only group.
  const columns: Record<TaskStatus, Task[]> = {
    TODO: tasks.filter((t) => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter((t) => t.status === 'DONE'),
  }

  return {
    columns,
    meta,
    isPending,
    isLoading,
    isError,
    error,
    refetch,
    moveTask: moveTask.mutateAsync,
    isMoving: moveTask.isPending,
  }
}