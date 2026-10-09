import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { useProject } from '../hooks/useProject'
import { useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjectMutations'
import { useCreateTask } from '../hooks/useTaskMutations'
import { ProjectList } from '../components/project/ProjectList'
import { ProjectForm, type ProjectFormValues } from '../components/project/ProjectForm'
import { DeleteProjectDialog } from '../components/project/DeleteProjectDialog'
import { TaskForm, type TaskFormValues } from '../components/task/TaskForm'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icons'
import { Dialog } from '../components/ui/Dialog'
import type { ProjectListItem } from '../api/types'

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined

  const { data: projects, isPending, isError, error, refetch } = useProjects()
  const { data: selectedProject } = useProject(projectId ?? '')
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const createTask = useCreateTask()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectListItem | null>(null)

  const handleCreateSubmit = async (values: ProjectFormValues) => {
    await createProject.mutateAsync(values)
    setIsCreateOpen(false)
  }

  const handleEditSubmit = async (values: ProjectFormValues) => {
    if (!projectId) return
    await updateProject.mutateAsync({ id: projectId, input: values })
    setIsEditOpen(false)
  }

  const handleDelete = async () => {
    if (!projectToDelete) return
    await deleteProject.mutateAsync(projectToDelete.id)
    setProjectToDelete(null)
    setIsDeleteOpen(false)
  }

  const handleCreateTaskSubmit = useCallback(
    async (values: TaskFormValues) => {
      await createTask.mutateAsync({
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        startDate: values.startDate,
        dueDate: values.dueDate,
        projectId: projectId,
      })
      setIsCreateTaskOpen(false)
    },
    [createTask, projectId],
  )

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="border border-line rounded-md p-4 animate-pulse">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-line rounded-md p-4 animate-pulse">
                <div className="skeleton h-4 w-48 mb-2" />
                <div className="skeleton h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="border border-bad rounded-md p-5 text-center">
        <p className="text-sm font-semibold text-bad">Could not load projects</p>
        <p className="text-xs text-muted mt-1">{error.message}</p>
        <Button variant="secondary" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const projectsList = projects ?? []

  const handleSelectProject = (id: string) => {
    if (projectId === id) {
      setSearchParams({})
    } else {
      setSearchParams({ projectId: id })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-fg">Projects</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <IconPlus className="w-4 h-4 mr-1.5" />
          New project
        </Button>
      </div>

      {projectsList.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Create your first project to get started."
          action={
            <Button className="mt-2" onClick={() => setIsCreateOpen(true)}>
              <IconPlus className="w-4 h-4 mr-1.5" />
              New project
            </Button>
          }
        />
      ) : (
        <ProjectList
          projects={projectsList}
          selectedProjectId={projectId ?? ''}
          onSelect={handleSelectProject}
        />
      )}

      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New project"
      >
        <ProjectForm
          onSubmit={handleCreateSubmit}
          onClose={() => setIsCreateOpen(false)}
          submitLabel="Create project"
          isSubmitting={createProject.isPending}
        />
      </Dialog>

      {projectId && selectedProject && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">{selectedProject.name}</h2>
            <Button onClick={() => setIsCreateTaskOpen(true)}>
              <IconPlus className="w-4 h-4 mr-1.5" />
              New task
            </Button>
          </div>
          <Dialog
            open={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            title="Edit project"
          >
            <ProjectForm
              initialValues={{
                name: selectedProject.name,
                description: selectedProject.description,
                startDate: selectedProject.startDate,
                targetDate: selectedProject.targetDate,
              }}
              onSubmit={handleEditSubmit}
              onClose={() => setIsEditOpen(false)}
              submitLabel="Save changes"
              isSubmitting={updateProject.isPending}
            />
          </Dialog>

          <DeleteProjectDialog
            open={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
            project={projectToDelete}
            onConfirm={handleDelete}
            isLoading={deleteProject.isPending}
          />
        </>
      )}

      <Dialog
        open={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        title="New task"
      >
        <TaskForm
          initialValues={{ projectId: projectId ?? null }}
          onSubmit={handleCreateTaskSubmit}
          onClose={() => setIsCreateTaskOpen(false)}
          submitLabel="Create task"
          isSubmitting={createTask.isPending}
        />
      </Dialog>
    </div>
  )
}