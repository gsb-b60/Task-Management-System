import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'
import { toast } from 'sonner'
import type { Task, TaskStatus, TaskPriority } from '../api/types'

interface TaskListData {
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

type CreateTaskInput = {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  startDate?: string | null
  dueDate?: string | null
  projectId?: string | null
}

type UpdateTaskInput = {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  startDate?: string | null
  dueDate?: string | null
  projectId?: string | null
}

function invalidateTaskQueries(queryClient: ReturnType<typeof useQueryClient>, projectId?: string) {
  queryClient.invalidateQueries({ queryKey: ['tasks'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['board', { projectId }] })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => dataApi.tasks.create(input),
    onSuccess: (createdTask) => {
      invalidateTaskQueries(queryClient, createdTask.projectId ?? undefined)
      toast.success('Task created')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to create task')
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      dataApi.tasks.update(id, input),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(queryKeys.task(updatedTask.id), updatedTask)
      invalidateTaskQueries(queryClient, updatedTask.projectId ?? undefined)
      toast.success('Task updated')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to update task')
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dataApi.tasks.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      await queryClient.cancelQueries({ queryKey: ['board'] })

      const previousTasks = queryClient.getQueriesData<TaskListData>({ queryKey: ['tasks'] })
      const previousBoard = queryClient.getQueriesData<BoardData>({ queryKey: ['board'] })

      // Get projectId from the task before deleting
      let projectId: string | undefined
      for (const [key, data] of previousTasks) {
        if (key[0] === 'tasks' && data?.data) {
          const task = data.data.find((t) => t.id === id)
          if (task?.projectId) {
            projectId = task.projectId
            break
          }
        }
      }
      if (!projectId) {
        for (const [key, data] of previousBoard) {
          if (key[0] === 'board' && data?.data) {
            const task = data.data.find((t) => t.id === id)
            if (task?.projectId) {
              projectId = task.projectId
              break
            }
          }
        }
      }

      return { previousTasks, previousBoard, projectId }
    },
    onSuccess: (_data, _variables, context) => {
      invalidateTaskQueries(queryClient, context?.projectId)
      toast.success('Task deleted')
    },
    onError: (error, _variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
      if (context?.previousBoard) {
        context.previousBoard.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
      toast.error(error.message ?? 'Failed to delete task')
    },
  })
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