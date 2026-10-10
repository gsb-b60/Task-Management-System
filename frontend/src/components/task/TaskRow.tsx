import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime, dueLabel, formatProjectLabel } from '../../lib/format'
import { useUpdateTask } from '../../hooks/useTaskMutations'
import { useOpenDropdown } from '../../hooks/useOpenDropdown'
import { Select } from '../ui/Select'
import { TextInput } from '../ui/Input'
import { toDateTimeInputValue } from '../../lib/dateOnly'
import type { ProjectListItem, Task, TaskStatus, TaskPriority } from '../../api/types'
import { IconCalendar } from '../ui/Icons'

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

interface TaskRowProps {
  task: Task
  projectName?: string | null
  projects?: ProjectListItem[]
  /** When set, a plain click opens the detail drawer instead of navigating. */
  onSelect?: (taskId: string) => void
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

export function TaskRow({ task, projectName = null, projects = [], onSelect }: TaskRowProps) {
  const shortId = `#${task.id.slice(-4)}`
  const updateTask = useUpdateTask()
  const [editingField, setEditingField] = useState<'status' | 'priority' | 'project' | 'startDate' | 'dueDate' | null>(null)
  const [dateDraft, setDateDraft] = useState('')
  const openDropdown = useOpenDropdown()

  function openDateEditor(field: 'startDate' | 'dueDate', current: string | null | undefined) {
    setDateDraft(toDateTimeInputValue(current) ?? '')
    setEditingField(field)
  }

  const commit = async (patch: { status?: TaskStatus; priority?: TaskPriority; projectId?: string | null; startDate?: string | null; dueDate?: string | null }) => {
    try {
      await updateTask.mutateAsync({ id: task.id, input: patch })
      setEditingField(null)
    } catch {
      // Error toast comes from the mutation; keep the editor open to retry.
    }
  }

  return (
    <tr
      className={`hover:bg-subtle ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect ? () => onSelect(task.id) : undefined}
      onKeyDown={onSelect ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(task.id)
        }
      } : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `Open details for ${task.title}` : undefined}
    >
      <td className="px-3 py-2 font-mono text-[10px] text-faint">{shortId}</td>
      <td className="px-3 py-2">
        <Link
          to={`/tasks/${task.id}`}
          onClick={onSelect ? (e) => {
            // Plain click → side panel (the row handler would toggle it shut
            // again, so stop the bubble). Ctrl/Cmd+click → full page.
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
              e.preventDefault()
              e.stopPropagation()
              onSelect(task.id)
            }
          } : undefined}
          className="text-fg font-medium hover:underline"
        >
          {task.title}
        </Link>
      </td>
      <td className="px-3 py-2 text-muted">
        {editingField === 'project' ? (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
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
                if (!updateTask.isPending) setEditingField(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingField(null)
              }}
            />
          </span>
        ) : (
          <button
            type="button"
            title={projectName ? 'Change project' : 'Assign project'}
            onClick={(e) => {
              e.stopPropagation()
              setEditingField('project')
            }}
            className="hover:underline cursor-pointer"
          >
            {projectName ?? <span className="text-faint">—</span>}
          </button>
        )}
      </td>
      <td className="px-3 py-2">
        {editingField === 'priority' ? (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Select
              ref={openDropdown}
              aria-label={`Priority for ${task.title}`}
              options={PRIORITY_OPTIONS}
              value={task.priority}
              disabled={updateTask.isPending}
              autoFocus
              onChange={(e) => void commit({ priority: e.target.value as TaskPriority })}
              onBlur={() => {
                if (!updateTask.isPending) setEditingField(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingField(null)
              }}
            />
          </span>
        ) : (
          <button
            type="button"
            title="Change priority"
            onClick={(e) => {
              e.stopPropagation()
              setEditingField('priority')
            }}
            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer hover:opacity-80 ${PRIORITY_STYLE[task.priority]}`}
          >
            {task.priority}
          </button>
        )}
      </td>
      <td className="px-3 py-2">
        {editingField === 'status' ? (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Select
              ref={openDropdown}
              aria-label={`Status for ${task.title}`}
              options={STATUS_OPTIONS}
              value={task.status}
              disabled={updateTask.isPending}
              autoFocus
              onChange={(e) => void commit({ status: e.target.value as TaskStatus })}
              onBlur={() => {
                if (!updateTask.isPending) setEditingField(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingField(null)
              }}
            />
          </span>
        ) : (
          <button
            type="button"
            title="Change status"
            onClick={(e) => {
              e.stopPropagation()
              setEditingField('status')
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer hover:opacity-80 ${STATUS_STYLE[task.status].pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[task.status].dot}`} />
            {task.status === 'IN_PROGRESS' ? 'In progress' : task.status === 'TODO' ? 'Todo' : 'Done'}
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-muted">
        {editingField === 'startDate' ? (
          <span
            className="inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <TextInput
              aria-label={`Start time for ${task.title}`}
              type="datetime-local"
              value={dateDraft}
              disabled={updateTask.isPending}
              autoFocus
              onChange={(e) => setDateDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingField(null)
                if (e.key === 'Enter') void commit({ startDate: dateDraft || null })
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void commit({ startDate: dateDraft || null })
              }}
              disabled={updateTask.isPending}
              className="px-2 py-1 text-[11px] font-semibold text-white bg-ok hover:bg-ok-dark rounded disabled:opacity-50"
            >
              Apply
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={(e) => {
                e.stopPropagation()
                setEditingField(null)
              }}
              className="px-1.5 py-1 text-xs text-muted hover:text-fg"
            >
              ✕
            </button>
          </span>
        ) : (
          <button
            type="button"
            title="Change start time"
            onClick={(e) => {
              e.stopPropagation()
              openDateEditor('startDate', task.startDate)
            }}
            className="hover:underline cursor-pointer"
          >
            {task.startDate ? formatDateTime(task.startDate) : <span className="text-faint">—</span>}
          </button>
        )}
      </td>
      <td className={`px-3 py-2 text-right ${task.isOverdue ? 'text-bad font-semibold' : 'text-muted'}`}>
        {editingField === 'dueDate' ? (
          <span
            className="inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <TextInput
              aria-label={`Due time for ${task.title}`}
              type="datetime-local"
              value={dateDraft}
              disabled={updateTask.isPending}
              autoFocus
              onChange={(e) => setDateDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingField(null)
                if (e.key === 'Enter') void commit({ dueDate: dateDraft || null })
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void commit({ dueDate: dateDraft || null })
              }}
              disabled={updateTask.isPending}
              className="px-2 py-1 text-[11px] font-semibold text-white bg-ok hover:bg-ok-dark rounded disabled:opacity-50"
            >
              Apply
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={(e) => {
                e.stopPropagation()
                setEditingField(null)
              }}
              className="px-1.5 py-1 text-xs text-muted hover:text-fg"
            >
              ✕
            </button>
          </span>
        ) : task.dueDate ? (
          <button
            type="button"
            title="Change due time"
            onClick={(e) => {
              e.stopPropagation()
              openDateEditor('dueDate', task.dueDate)
            }}
            className="inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <IconCalendar className="w-3 h-3" />
            {formatDateTime(task.dueDate)}
            {task.daysUntilDue != null && (
              <span className="text-[10px]">{dueLabel(task.daysUntilDue)}</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            title="Set due time"
            onClick={(e) => {
              e.stopPropagation()
              openDateEditor('dueDate', task.dueDate)
            }}
            className="text-[10px] text-faint hover:underline cursor-pointer"
          >
            No due date
          </button>
        )}
      </td>
    </tr>
  )
}