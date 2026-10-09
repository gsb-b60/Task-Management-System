import { Link } from 'react-router-dom'
import { formatDateOnly, dueLabel } from '../../lib/format'
import type { Task, TaskStatus, TaskPriority } from '../../api/types'
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
}

export function TaskRow({ task }: TaskRowProps) {
  const shortId = `#${task.id.slice(-4)}`

  return (
    <tr className="hover:bg-subtle">
      <td className="px-3 py-2 font-mono text-[10px] text-faint">{shortId}</td>
      <td className="px-3 py-2">
        <Link
          to={`/tasks/${task.id}`}
          className="text-fg font-medium hover:underline"
        >
          {task.title}
        </Link>
      </td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[task.status].pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[task.status].dot}`} />
          {task.status === 'IN_PROGRESS' ? 'In progress' : task.status === 'TODO' ? 'Todo' : 'Done'}
        </span>
      </td>
      <td className={`px-3 py-2 text-right ${task.isOverdue ? 'text-bad font-semibold' : 'text-muted'}`}>
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1">
            <IconCalendar className="w-3 h-3" />
            {formatDateOnly(task.dueDate)}
            <span className="text-[10px]">{dueLabel(task.daysUntilDue)}</span>
          </span>
        ) : (
          <span className="text-[10px] text-faint">No due date</span>
        )}
      </td>
    </tr>
  )
}