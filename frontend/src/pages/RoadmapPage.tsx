import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useProjects } from '../hooks/useProjects'
import { useCreateTask } from '../hooks/useTaskMutations'
import { Roadmap } from '../components/roadmap/Roadmap'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { IconPlus } from '../components/ui/Icons'
import { TaskForm, type TaskFormValues } from '../components/task/TaskForm'

export function RoadmapPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined
  const { data, isPending, isError, error, refetch } = useTasks()
  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const tasks = data?.data ?? []

  const handleCreateTaskSubmit = async (values: TaskFormValues) => {
    await createTask.mutateAsync({
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      startDate: values.startDate,
      dueDate: values.dueDate,
      projectId: projectId ?? (values.projectId ? values.projectId : null),
    })
    setIsCreateTaskOpen(false)
  }

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="border border-line rounded-md p-4 animate-pulse">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-4 w-full mb-4" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="border border-bad rounded-md p-5 text-center">
        <p className="text-sm font-semibold text-bad">Could not load roadmap</p>
        <p className="text-xs text-muted mt-1">{error.message}</p>
        <button
          className="mt-3 border border-line rounded-md px-3 py-1.5 text-xs font-medium text-fg bg-canvas hover:bg-subtle"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg">Roadmap</h1>
        <Button onClick={() => setIsCreateTaskOpen(true)}>
          <IconPlus className="w-4 h-4 mr-1.5" />
          New task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks on the roadmap"
          message="Create tasks with due dates to see them on the roadmap."
          action={
            <Button onClick={() => setIsCreateTaskOpen(true)}>
              <IconPlus className="w-4 h-4 mr-1.5" />
              New task
            </Button>
          }
        />
      ) : (
        <Roadmap tasks={tasks} />
      )}
    </div>

    <Dialog
      open={isCreateTaskOpen}
      onClose={() => setIsCreateTaskOpen(false)}
      title="New task"
    >
      <TaskForm
        key={projectId ?? 'all'}
        initialValues={{ projectId: projectId ?? null }}
        onSubmit={handleCreateTaskSubmit}
        onClose={() => setIsCreateTaskOpen(false)}
        submitLabel="Create task"
        isSubmitting={createTask.isPending}
        projects={projects}
      />
    </Dialog>
    </>
  )
}