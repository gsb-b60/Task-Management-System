import { formatDateOnly, dueLabel } from '../../lib/format'
import type { Task, TaskPriority } from '../../api/types'
import { IconCalendar, IconExternalLink } from '../ui/Icons'

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: 'border border-line rounded-full bg-subtle text-muted',
  MEDIUM: 'border border-warn rounded-full bg-warnbg text-warn',
  HIGH: 'border border-bad rounded-full bg-badbg text-bad',
}

interface TaskCardProps {
  task: Task
  onClick?: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

export function TaskCard({ task, onClick, dragHandleProps }: TaskCardProps) {
  const shortId = `#${task.id.slice(-4)}`
  const hasGitHubIssue = task.githubIssueNumber !== null

  return (
    <div
      {...dragHandleProps}
      className={`
        border border-line rounded-md p-2.5 hover:border-muted cursor-pointer bg-canvas
        transition-shadow duration-150
      `}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Task ${shortId}: ${task.title}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-faint">{shortId}</span>
        {hasGitHubIssue && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold border border-info rounded-full bg-infobg text-info">
            <IconExternalLink className="w-2.5 h-2.5" />
            GH-{task.githubIssueNumber}
          </span>
        )}
      </div>
      <div className="text-xs text-fg font-medium mt-1 leading-snug">{task.title}</div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold ${
            task.isOverdue ? 'text-bad' : 'text-muted'
          }`}>
            <IconCalendar className="w-3 h-3" />
            {formatDateOnly(task.dueDate)}
            <span className="text-[10px]">{dueLabel(task.daysUntilDue)}</span>
          </span>
        )}
      </div>
    </div>
  )
}