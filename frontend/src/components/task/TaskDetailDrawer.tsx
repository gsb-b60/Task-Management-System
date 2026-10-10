import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTask } from '../../hooks/useTask'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTaskMutations'
import { useOpenDropdown } from '../../hooks/useOpenDropdown'
import { formatDateTime, formatProjectLabel } from '../../lib/format'
import { Markdown } from '../ui/Markdown'
import { toDateTimeInputValue } from '../../lib/dateOnly'
import type { ProjectListItem, TaskPriority, TaskStatus } from '../../api/types'
import { IconClose } from '../ui/Icons'
import { Button } from '../ui/Button'
import { TextInput } from '../ui/Input'
import { Select } from '../ui/Select'
import { DeleteTaskDialog } from './DeleteTaskDialog'

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

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
] as const

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
] as const

type EditableField =
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'startDate'
  | 'dueDate'
  | 'project'
  | null

interface TaskDetailDrawerProps {
  taskId: string | null
  projects: ProjectListItem[]
  onClose: () => void
  /**
   * `inline` renders as a menu column in the page flow (tasks list);
   * `overlay` floats as a stacked panel over the content (board).
   */
  variant?: 'inline' | 'overlay'
}

/**
 * Inline detail menu for a task list row — a flush full-height column on the
 * side of the list, styled like the app sidebar. Every field edits in place
 * (click value → edit → commit), so there is no separate form step. Same
 * plane as everything else: no floating, no backdrop, no stacking.
 * Controlled by the `?selected=` URL param so a task can still be deep-linked
 * (the `/tasks/:id` page stays for that).
 */
export function TaskDetailDrawer({ taskId, projects, onClose, variant = 'inline' }: TaskDetailDrawerProps) {
  const { data: task, isPending, isError, error, refetch } = useTask(taskId ?? '')
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const openDropdown = useOpenDropdown()
  const [editing, setEditing] = useState<EditableField>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftDateTime, setDraftDateTime] = useState('')

  function openDateEditor(field: 'startDate' | 'dueDate', current: string | null | undefined) {
    setDraftDateTime(toDateTimeInputValue(current) ?? '')
    setEditing(field)
  }

  // The panel remounts per task (parents pass key={taskId}), so editing,
  // delete-confirm and drafts always start fresh — no reset effect needed.
  useEffect(() => {
    if (!taskId) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Overlay only: the inline menu never traps the page behind it.
    if (variant === 'overlay') document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      if (variant === 'overlay') document.body.style.overflow = ''
    }
  }, [taskId, onClose, variant])

  if (!taskId) return null

  const project = task?.projectId
    ? projects.find((p) => p.id === task.projectId)
    : undefined

  const commit = async (patch: {
    title?: string
    description?: string | null
    status?: TaskStatus
    priority?: TaskPriority
    startDate?: string | null
    dueDate?: string | null
    projectId?: string | null
  }) => {
    if (!task) return
    try {
      await updateTask.mutateAsync({ id: task.id, input: patch })
      setEditing(null)
    } catch {
      // Error toast comes from the mutation; the editor stays open to retry.
    }
  }

  const cancelEditing = () => setEditing(null)

  const handleDelete = async () => {
    if (!task) return
    await deleteTask.mutateAsync(task.id)
    onClose()
  }

  return (
    <>
      {variant === 'overlay' && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    <aside
      role="dialog"
      aria-label={task ? `Task details: ${task.title}` : 'Task details'}
      className={
        variant === 'overlay'
          ? 'fixed top-0 right-0 h-full w-[380px] max-w-[calc(100vw-2rem)] z-50 bg-canvas border-l border-line shadow-2xl flex flex-col'
          : 'w-72 max-w-full flex-none self-stretch border-l border-line bg-canvas -my-5 -mr-5 ml-1 p-3'
      }
    >
        <div className={`flex items-center justify-between mb-1.5 ${variant === 'overlay' ? 'px-4 pt-4' : ''}`}>
          <span className="text-[10px] font-semibold text-faint uppercase tracking-wide">
            Task details
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-faint hover:text-fg rounded hover:bg-subtle flex-none"
            aria-label="Close details"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className={variant === 'overlay' ? 'px-4 pb-4 overflow-y-auto flex-1 min-h-0' : undefined}>
          {isPending && (
            <div className="space-y-3" aria-busy="true">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          )}

          {isError && (
            <div className="border border-bad rounded-md p-5 text-center">
              <p className="text-sm font-semibold text-bad">Could not load task</p>
              <p className="text-xs text-muted mt-1">{error.message}</p>
              <Button variant="secondary" className="mt-3" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {task && (
            <div className="space-y-3">
              {editing === 'title' ? (
                <TextInput
                  aria-label="Task title"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  autoFocus
                  disabled={updateTask.isPending}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') {
                      const next = draftTitle.trim()
                      if (next && next !== task.title) void commit({ title: next })
                      else if (next) cancelEditing()
                    }
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  onBlur={() => {
                    if (updateTask.isPending) return
                    const next = draftTitle.trim()
                    if (next && next !== task.title) void commit({ title: next })
                    else cancelEditing()
                  }}
                />
              ) : (
                <button
                  type="button"
                  title="Edit title"
                  onClick={() => {
                    setDraftTitle(task.title)
                    setEditing('title')
                  }}
                  className="block w-full text-left text-sm font-semibold text-fg hover:underline truncate"
                >
                  #{task.id.slice(-4)} {task.title}
                </button>
              )}

              {editing === 'description' ? (
                <textarea
                  aria-label="Task description"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={3}
                  autoFocus
                  disabled={updateTask.isPending}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  onBlur={() => {
                    if (updateTask.isPending) return
                    if (draftDescription !== (task.description ?? '')) {
                      void commit({ description: draftDescription || null })
                    } else {
                      cancelEditing()
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-line rounded-md bg-canvas text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Optional description"
                />
              ) : task.description ? (
                <div
                  role="button"
                  tabIndex={0}
                  title="Edit description"
                  onClick={(e) => {
                    // Links navigate instead of opening the editor.
                    if ((e.target as HTMLElement).closest('a')) return
                    setDraftDescription(task.description ?? '')
                    setEditing('description')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setDraftDescription(task.description ?? '')
                      setEditing('description')
                    }
                  }}
                  className="block w-full text-left rounded hover:bg-subtle cursor-pointer"
                >
                  <Markdown text={task.description} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraftDescription('')
                    setEditing('description')
                  }}
                  className="block text-xs text-faint hover:text-fg hover:underline"
                >
                  Add a description…
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-faint">Status</p>
                  {editing === 'status' ? (
                    <Select
                      ref={openDropdown}
                      aria-label={`Status for ${task.title}`}
                      options={STATUS_OPTIONS}
                      value={task.status}
                      disabled={updateTask.isPending}
                      autoFocus
                      onChange={(e) => void commit({ status: e.target.value as TaskStatus })}
                      onBlur={() => {
                        if (!updateTask.isPending) cancelEditing()
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Escape') cancelEditing()
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      title="Change status"
                      onClick={() => setEditing('status')}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold cursor-pointer hover:opacity-80 ${STATUS_STYLE[task.status].pill}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[task.status].dot}`} />
                      {task.status === 'IN_PROGRESS' ? 'In progress' : task.status === 'TODO' ? 'Todo' : 'Done'}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-faint">Priority</p>
                  {editing === 'priority' ? (
                    <Select
                      ref={openDropdown}
                      aria-label={`Priority for ${task.title}`}
                      options={PRIORITY_OPTIONS}
                      value={task.priority}
                      disabled={updateTask.isPending}
                      autoFocus
                      onChange={(e) => void commit({ priority: e.target.value as TaskPriority })}
                      onBlur={() => {
                        if (!updateTask.isPending) cancelEditing()
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === 'Escape') cancelEditing()
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      title="Change priority"
                      onClick={() => setEditing('priority')}
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold cursor-pointer hover:opacity-80 ${PRIORITY_STYLE[task.priority]}`}
                    >
                      {task.priority}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-faint">Start time</p>
                  {editing === 'startDate' ? (
                    <div className="flex items-center gap-1">
                      <TextInput
                        aria-label="Start time"
                        type="datetime-local"
                        value={draftDateTime}
                        disabled={updateTask.isPending}
                        autoFocus
                        onChange={(e) => setDraftDateTime(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Escape') cancelEditing()
                          if (e.key === 'Enter') void commit({ startDate: draftDateTime || null })
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void commit({ startDate: draftDateTime || null })}
                        disabled={updateTask.isPending}
                        className="px-2 py-1 text-[11px] font-semibold text-white bg-ok hover:bg-ok-dark rounded disabled:opacity-50 flex-none"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel"
                        onClick={cancelEditing}
                        className="px-1.5 py-1 text-xs text-muted hover:text-fg flex-none"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Edit start time"
                      onClick={() => openDateEditor('startDate', task.startDate)}
                      className="text-sm text-fg hover:underline"
                    >
                      {task.startDate ? formatDateTime(task.startDate) : '—'}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-faint">Due time</p>
                  {editing === 'dueDate' ? (
                    <div className="flex items-center gap-1">
                      <TextInput
                        aria-label="Due time"
                        type="datetime-local"
                        value={draftDateTime}
                        disabled={updateTask.isPending}
                        autoFocus
                        onChange={(e) => setDraftDateTime(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Escape') cancelEditing()
                          if (e.key === 'Enter') void commit({ dueDate: draftDateTime || null })
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void commit({ dueDate: draftDateTime || null })}
                        disabled={updateTask.isPending}
                        className="px-2 py-1 text-[11px] font-semibold text-white bg-ok hover:bg-ok-dark rounded disabled:opacity-50 flex-none"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel"
                        onClick={cancelEditing}
                        className="px-1.5 py-1 text-xs text-muted hover:text-fg flex-none"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      title="Edit due time"
                      onClick={() => openDateEditor('dueDate', task.dueDate)}
                      className="text-sm text-fg hover:underline"
                    >
                      {task.dueDate ? formatDateTime(task.dueDate) : '—'}
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-line">
                <p className="text-xs font-medium text-faint">Project</p>
                {editing === 'project' ? (
                  <Select
                    ref={openDropdown}
                    aria-label={`Project for ${task.title}`}
                    options={[
                      { value: '', label: 'No project' },
                      ...projects.map((p) => ({ value: p.id, label: formatProjectLabel(p.projectNumber, p.name) })),
                    ]}
                    value={task.projectId ?? ''}
                    disabled={updateTask.isPending}
                    autoFocus
                    onChange={(e) => void commit({ projectId: e.target.value || null })}
                    onBlur={() => {
                      if (!updateTask.isPending) cancelEditing()
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Escape') cancelEditing()
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    title={project ? 'Change project' : 'Assign project'}
                    onClick={() => setEditing('project')}
                    className="text-sm text-fg hover:underline"
                  >
                    {project ? formatProjectLabel(project.projectNumber, project.name) : 'Unassigned'}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Link
                  to={`/tasks/${task.id}`}
                  className="text-xs text-accent hover:underline"
                >
                  Open full page
                </Link>
                <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        <DeleteTaskDialog
          open={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          task={task ?? null}
          onConfirm={handleDelete}
          isLoading={deleteTask.isPending}
        />
    </aside>
    </>
  )
}
