import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDateOnly, dueLabel } from '../../lib/format'
import type { Task, TaskPriority, TaskStatus } from '../../api/types'
import { IconCalendar, IconExternalLink } from '../ui/Icons'

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: 'border border-line rounded-full bg-subtle text-muted',
  MEDIUM: 'border border-warn rounded-full bg-warnbg text-warn',
  HIGH: 'border border-bad rounded-full bg-badbg text-bad',
}

interface TaskCardProps {
  task: Task
  projectName?: string | null
  onClick?: () => void
}

export function TaskCard({ task, projectName = null, onClick }: TaskCardProps) {
  const shortId = `#${task.id.slice(-4)}`
  const hasGitHubIssue = task.githubIssueNumber !== null
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { status: task.status satisfies TaskStatus },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        border border-line rounded-md p-3 hover:border-muted cursor-grab active:cursor-grabbing bg-canvas
        transition-shadow duration-150 touch-none select-none
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Task ${shortId}: ${task.title}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-faint">{shortId}</span>
        {hasGitHubIssue && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 text-sm font-semibold border border-info rounded-full bg-infobg text-info">
            <IconExternalLink className="w-3 h-3" />
            GH-{task.githubIssueNumber}
          </span>
        )}
      </div>
      <div className="text-base text-fg font-medium mt-1 leading-snug">{task.title}</div>
      {projectName && (
        <div className="mt-0.5 text-sm text-faint truncate">{projectName}</div>
      )}
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 text-sm font-semibold ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-sm font-semibold ${
            task.isOverdue ? 'text-bad' : 'text-muted'
          }`}>
            <IconCalendar className="w-3.5 h-3.5" />
            {formatDateOnly(task.dueDate)}
            {task.daysUntilDue != null && (
              <span>{dueLabel(task.daysUntilDue)}</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
