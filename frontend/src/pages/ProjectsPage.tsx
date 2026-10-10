import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProjects } from '../hooks/useProjects'
import { useProject } from '../hooks/useProject'
import { useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjectMutations'
import { ProjectList } from '../components/project/ProjectList'
import { ProjectForm, type ProjectFormValues } from '../components/project/ProjectForm'
import { DeleteProjectDialog } from '../components/project/DeleteProjectDialog'
import { ImportReposDialog } from '../components/project/ImportReposDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { IconPlus, IconGithub } from '../components/ui/Icons'
import { Dialog } from '../components/ui/Dialog'
import type { ProjectListItem } from '../api/types'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined

  const { data: projects, isPending, isError, error, refetch } = useProjects()
  const { data: selectedProject } = useProject(projectId ?? '')
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
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
    navigate(`/tasks?projectId=${id}`)
  }

  const handleEditProject = (id: string) => {
    setSearchParams({ projectId: id })
    setIsEditOpen(true)
  }

  const handleDeleteProject = (project: ProjectListItem) => {
    setProjectToDelete(project)
    setIsDeleteOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-fg">Projects</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
            <IconGithub className="w-4 h-4 mr-1.5" />
            From GitHub
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <IconPlus className="w-4 h-4 mr-1.5" />
            New project
          </Button>
        </div>
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
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
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

      <ImportReposDialog
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        projects={projectsList}
        // Remount on every open for a fresh search and selection.
        key={isImportOpen ? 'open' : 'closed'}
      />
    </div>
  )
}