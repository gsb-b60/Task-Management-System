import { useState } from 'react'
import { useBoard } from '../hooks/useBoard'
import { useProjects } from '../hooks/useProjects'
import { Board } from '../components/board/Board'
import { EmptyState } from '../components/ui/EmptyState'
import { Select } from '../components/ui/Select'
import { TaskSort } from '../components/task/TaskSort'
import { TaskDetailDrawer } from '../components/task/TaskDetailDrawer'
import type { Task, TaskStatus } from '../api/types'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function BoardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined
  const selectedTaskId = searchParams.get('selected') ?? undefined
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc',
  )

  const handleProjectChange = (nextProjectId: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextProjectId) {
      next.set('projectId', nextProjectId)
    } else {
      next.delete('projectId')
    }
    setSearchParams(next, { replace: true })
  }
  
  const {
    columns,
    meta,
    isLoading,
    isError,
    error,
    refetch,
    moveTask,
    isMoving,
  } = useBoard({ projectId, sortBy, sortOrder })
  const { data: projects = [] } = useProjects()

  const handleMoveTask = async (taskId: string, status: TaskStatus) => {
    await moveTask({ taskId, status })
  }

  const handleTaskClick = (task: Task) => {
    const next = new URLSearchParams(searchParams)
    next.set('selected', task.id)
    setSearchParams(next, { replace: true })
  }

  const handleCloseDetail = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('selected')
    setSearchParams(next, { replace: true })
  }

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="border border-line rounded-md p-4 animate-pulse">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-line rounded-md p-3 animate-pulse">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="space-y-2">
                  <div className="skeleton h-8 w-full" />
                  <div className="skeleton h-8 w-full" />
                </div>
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
        <p className="text-sm font-semibold text-bad">Could not load board</p>
        <p className="text-xs text-muted mt-1">{error?.message ?? 'Unknown error'}</p>
        <button
          className="mt-3 border border-line rounded-md px-3 py-1.5 text-xs font-medium text-fg bg-canvas hover:bg-subtle"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  const totalTasks = Object.values(columns).flat().length

  if (totalTasks === 0) {
    return (
      <EmptyState
        title="No tasks on the board"
        message="Create your first task to get started."
        action={
          <button
            className="mt-2 border border-line rounded-md px-3 py-1.5 text-xs font-medium text-fg bg-canvas hover:bg-subtle"
            onClick={() => navigate(`/tasks?create=1${projectId ? `&projectId=${projectId}` : ''}`)}
          >
            New task
          </button>
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-fg">Board</h1>
        <div className="flex items-center gap-3">
          {isMoving && (
            <span className="text-xs text-accent animate-pulse">
              Saving…
            </span>
          )}
          <TaskSort
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={setSortBy}
            onSortOrderChange={setSortOrder}
          />
          <div className="w-[180px]">
            <Select
              aria-label="Filter by project"
              value={projectId ?? ''}
              onChange={(e) => handleProjectChange(e.target.value || null)}
              options={[
                { value: '', label: 'Project: All' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>
      </div>

      <Board
        columns={columns}
        meta={meta}
        projects={projects}
        onTaskClick={handleTaskClick}
        onMoveTask={handleMoveTask}
      />
      <TaskDetailDrawer
        variant="overlay"
        taskId={selectedTaskId ?? null}
        projects={projects}
        onClose={handleCloseDetail}
      />
    </div>
  )
}