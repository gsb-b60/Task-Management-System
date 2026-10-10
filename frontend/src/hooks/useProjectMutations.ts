import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dataApi } from '../api'
import type { FromGitHubItem, ProjectListItem } from '../api/types'
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

export function useCreateProjectsFromGitHub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: FromGitHubItem[]) => dataApi.projects.createFromGitHub(items),
    onSuccess: (result) => {
      // Merge created projects into the list cache so pills show immediately.
      queryClient.setQueryData<ProjectListItem[]>(queryKeys.projects(), (previous) => {
        const created: ProjectListItem[] = result.created.map(({ project, repository }) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          startDate: project.startDate,
          targetDate: project.targetDate,
          color: project.color,
          projectNumber: project.projectNumber,
          taskCount: 0,
          completedTaskCount: 0,
          repository: {
            githubId: repository.githubId,
            fullName: repository.fullName,
            isPrivate: repository.visibility === 'private',
          },
          createdAt: project.createdAt,
        }))
        return previous ? [...previous, ...created] : created
      })
      invalidateProjectQueries(queryClient)
      const skipped = result.skipped.length
      const issues = result.created.reduce((total, entry) => total + entry.importedCount, 0)
      const projectsLabel = `${result.created.length} project${result.created.length === 1 ? '' : 's'} added from GitHub`
      const issuesLabel = issues > 0 ? `, ${issues} issue${issues === 1 ? '' : 's'} imported` : ''
      toast.success(
        skipped > 0 ? `${projectsLabel}${issuesLabel}, ${skipped} skipped` : `${projectsLabel}${issuesLabel}`,
      )
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to add projects from GitHub')
    },
  })
}