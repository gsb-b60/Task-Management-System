import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import { useCreateTask } from '../hooks/useTaskMutations'
import { useProjects } from '../hooks/useProjects'
import { TaskSearch } from '../components/task/TaskSearch'
import { TaskFilters } from '../components/task/TaskFilters'
import { TaskSort } from '../components/task/TaskSort'
import { TaskTable } from '../components/task/TaskTable'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icons'
import { TaskForm, type TaskFormValues } from '../components/task/TaskForm'
import { TaskDetailDrawer } from '../components/task/TaskDetailDrawer'
import { Dialog } from '../components/ui/Dialog'
import type { TaskStatus, TaskPriority } from '../api/types'

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined
  const selectedTaskId = searchParams.get('selected') ?? undefined
  const shouldCreate = searchParams.get('create') === '1'

  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [status, setStatus] = useState<TaskStatus[]>(
    searchParams.get('status')?.split(',') as TaskStatus[] ?? [],
  )
  const [priority, setPriority] = useState<TaskPriority[]>(
    searchParams.get('priority')?.split(',') as TaskPriority[] ?? [],
  )
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc',
  )

  const { data, isPending, isLoading, isError, error, refetch } = useTasks()
  const { data: projects = [] } = useProjects()
  const createTask = useCreateTask()

  const [isCreateOpen, setIsCreateOpen] = useState(shouldCreate)

  const handleCloseCreate = useCallback(() => {
    setIsCreateOpen(false)
    const next = new URLSearchParams(searchParams)
    next.delete('create')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleSelectTask = useCallback(
    (taskId: string) => {
      const next = new URLSearchParams(searchParams)
      // Clicking the open task again dismisses its popup.
      if (next.get('selected') === taskId) {
        next.delete('selected')
      } else {
        next.set('selected', taskId)
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const handleCloseDetail = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('selected')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatus([])
    setPriority([])
    // The list reads filters from the URL, so the params must go too —
    // resetting state alone would leave the stale filter applied.
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    next.delete('status')
    next.delete('priority')
    next.delete('projectId')
    next.set('page', '1')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
    },
    [],
  )

  const handlePageChange = useCallback(
    () => {
      // Page change is handled by TaskTable via URL
    },
    [],
  )

  const handlePageSizeChange = useCallback(
    () => {
      // Page size change is handled by TaskTable via URL
    },
    [],
  )

  const handleCreateSubmit = useCallback(
    async (values: TaskFormValues) => {
      await createTask.mutateAsync({
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        startDate: values.startDate,
        dueDate: values.dueDate,
        // An empty choice is "no project", never an empty-string id.
        projectId: values.projectId ? values.projectId : (projectId ?? null),
      })
      setIsCreateOpen(false)
    },
    [createTask, projectId],
  )

  const tasks = data?.data ?? []
  const meta = data?.meta ?? {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  }

  const hasFilters = status.length > 0 || priority.length > 0 || search.length > 0 || projectId !== undefined

  return (
    <div className="flex items-stretch gap-4">
      <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-fg">Tasks</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <IconPlus className="w-4 h-4 mr-1.5" />
          New task
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TaskSearch value={search} onChange={handleSearchChange} />
        <TaskFilters
          status={status}
          priority={priority}
          onStatusChange={setStatus}
          onPriorityChange={setPriority}
          projectId={projectId ?? null}
          projects={projects}
          // The filter lives in the URL (?projectId=), which this page reads
          // back on every render — no local state mirror needed.
          onProjectChange={() => {}}
        />
        <TaskSort
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortByChange={setSortBy}
          onSortOrderChange={setSortOrder}
        />
      </div>

      {isPending && (
        <div className="space-y-3" aria-busy="true">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border border-line rounded-md p-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-12" />
                <div className="skeleton h-4 w-32 flex-1" />
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-4 border border-bad rounded-md bg-badbg px-4 py-5 text-center">
          <p className="text-sm font-semibold text-bad">Could not load tasks</p>
          <p className="text-xs text-muted mt-1">{error.message}</p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {data && !isLoading && !isError && (
        <>
          {tasks.length === 0 ? (
            <EmptyState
              title={hasFilters ? 'No tasks match your filters' : 'No tasks yet'}
              message={hasFilters
                ? 'Try adjusting your search or filters, or clear them to see all tasks.'
                : 'Create your first task to get started.'}
              action={hasFilters ? (
                <Button variant="secondary" className="mt-2" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button className="mt-2" onClick={() => setIsCreateOpen(true)}>
                  <IconPlus className="w-4 h-4 mr-1.5" />
                  New task
                </Button>
              )}
            />
          ) : (
            <TaskTable
              tasks={tasks}
              meta={meta}
              projects={projects}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onSelectTask={handleSelectTask}
            />
          )}
        </>
      )}

      <Dialog
        open={isCreateOpen}
        onClose={handleCloseCreate}
        title="New task"
      >
        <TaskForm
          initialValues={{ projectId: projectId ?? null }}
          onSubmit={handleCreateSubmit}
          onClose={handleCloseCreate}
          submitLabel="Create task"
          isSubmitting={createTask.isPending}
          projects={projects}
        />
      </Dialog>
      </div>
      <TaskDetailDrawer
        taskId={selectedTaskId ?? null}
        projects={projects}
        onClose={handleCloseDetail}
      />
    </div>
  )
}