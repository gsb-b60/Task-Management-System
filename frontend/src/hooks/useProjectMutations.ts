import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dataApi } from '../api'
import { queryKeys } from '../lib/queryKeys'
import { toast } from 'sonner'

type CreateProjectInput = {
  name: string
  description?: string | null
  startDate?: string | null
  targetDate?: string | null
}

type UpdateProjectInput = {
  name?: string
  description?: string | null
  startDate?: string | null
  targetDate?: string | null
}

function invalidateProjectQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  queryClient.invalidateQueries({ queryKey: ['tasks'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => dataApi.projects.create(input),
    onSuccess: () => {
      invalidateProjectQueries(queryClient)
      toast.success('Project created')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to create project')
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      dataApi.projects.update(id, input),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(queryKeys.project(updatedProject.id), updatedProject)
      invalidateProjectQueries(queryClient)
      toast.success('Project updated')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to update project')
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dataApi.projects.delete(id),
    onSuccess: () => {
      invalidateProjectQueries(queryClient)
      toast.success('Project deleted')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to delete project')
    },
  })
}