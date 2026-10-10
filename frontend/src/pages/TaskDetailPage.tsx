import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTask } from '../hooks/useTask'
import { useUpdateTask, useDeleteTask } from '../hooks/useTaskMutations'
import { TaskForm, type TaskFormValues } from '../components/task/TaskForm'
import { DeleteTaskDialog } from '../components/task/DeleteTaskDialog'
import { Button } from '../components/ui/Button'
import { IconArrowLeft } from '../components/ui/Icons'
import { formatDateOnly } from '../lib/format'
import type { TaskStatus, TaskPriority } from '../api/types'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: task, isPending, isError, error, refetch } = useTask(id ?? '')
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const handleUpdateSubmit = async (values: TaskFormValues) => {
    await updateTask.mutateAsync({ id: id!, input: values })
    setIsEditing(false)
    refetch()
  }

  const handleDelete = async () => {
    await deleteTask.mutateAsync(id!)
    navigate('/tasks')
  }

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="border border-line rounded-md p-4 animate-pulse">
          <div className="skeleton h-6 w-48 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-8 w-full" />
            <div className="skeleton h-8 w-full" />
            <div className="skeleton h-8 w-full" />
            <div className="skeleton h-8 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="border border-bad rounded-md p-5 text-center">
        <p className="text-sm font-semibold text-bad">Could not load task</p>
        <p className="text-xs text-muted mt-1">{error.message}</p>
        <Button variant="secondary" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="border border-line rounded-md p-5 text-center">
        <p className="text-sm font-semibold text-fg">Task not found</p>
        <Button variant="secondary" className="mt-3" onClick={() => navigate('/tasks')}>
          Back to tasks
        </Button>
      </div>
    )
  }

  const STATUS_STYLE: Record<TaskStatus, { pill: string; dot: string }> = {
    TODO: { pill: 'border border-line rounded-full bg-subtle text-muted', dot: 'bg-faint' },
    IN_PROGRESS: { pill: 'border border-info rounded-full bg-infobg text-info', dot: 'bg-info' },
    DONE: { pill: 'border border-ok rounded-full bg-okbg text-ok', dot: 'bg-ok' },
  }

  const PRIORITY_STYLE: Record<TaskPriority, string> = {
    LOW: 'border border-line rounded-full bg-subtle text-muted',
    MEDIUM: 'border border-warn rounded-full bg-warnbg text-warn',
    HIGH: 'border border-bad rounded-full bg-badbg text-bad',
  }

  function dueLabel(daysUntilDue: number | null | undefined): string {
    if (daysUntilDue === null || daysUntilDue === undefined) return 'No due date'
    if (daysUntilDue === 0) return 'due today'
    if (daysUntilDue === 1) return 'in 1 day'
    if (daysUntilDue === -1) return 'overdue by 1 day'
    if (daysUntilDue < 0) return `overdue by ${Math.abs(daysUntilDue)} days`
    return `in ${daysUntilDue} days`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-lg font-semibold text-fg flex-1 truncate">#{task.id.slice(-4)} {task.title}</h1>
      </div>

      {isEditing ? (
        <TaskForm
          initialValues={{
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate,
            dueDate: task.dueDate,
            projectId: task.projectId,
          }}
          onSubmit={handleUpdateSubmit}
          submitLabel="Save changes"
          isSubmitting={updateTask.isPending}
        />
      ) : (
        <>
          <div className="border border-line rounded-md p-4 space-y-3">
            {task.description && (
              <div>
                <p className="text-xs font-medium text-faint mb-1">Description</p>
                <p className="text-sm text-fg whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs font-medium text-faint">Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[task.status].pill}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[task.status].dot}`} />
                  {task.status === 'IN_PROGRESS' ? 'In progress' : task.status === 'TODO' ? 'Todo' : 'Done'}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-faint">Priority</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[task.priority]}`}>
                  {task.priority}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-faint">Start date</p>
                <p className="text-sm text-fg">{task.startDate ? formatDateOnly(task.startDate) : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-faint">Due date</p>
                <p className={`text-sm ${task.isOverdue ? 'text-bad font-semibold' : 'text-fg'}`}>
                  {task.dueDate ? formatDateOnly(task.dueDate) : '—'}
                  {task.daysUntilDue != null && <span className="text-[10px] text-muted ml-1">{dueLabel(task.daysUntilDue)}</span>}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-line">
              <p className="text-xs font-medium text-faint">Project</p>
              <p className="text-sm text-fg">{task.projectId ? `#${task.projectId.slice(-4)}` : 'Unassigned'}</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        </>
      )}

      <DeleteTaskDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        task={task}
        onConfirm={handleDelete}
        isLoading={deleteTask.isPending}
      />
    </div>
  )
}