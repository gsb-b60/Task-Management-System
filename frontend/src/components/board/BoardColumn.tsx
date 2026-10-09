import { TaskCard } from './TaskCard'
import type { Task, TaskStatus } from '../../api/types'

const COLUMN_STYLE: Record<TaskStatus, { header: string; dot: string }> = {
  TODO: { header: 'bg-faint', dot: 'bg-faint' },
  IN_PROGRESS: { header: 'bg-info', dot: 'bg-info' },
  DONE: { header: 'bg-ok', dot: 'bg-ok' },
}

interface BoardColumnProps {
  status: TaskStatus
  tasks: Task[]
  totalCount: number
  onTaskClick: (task: Task) => void
  dragOver: boolean
}

export function BoardColumn({ status, tasks, totalCount, onTaskClick, dragOver }: BoardColumnProps) {
  const style = COLUMN_STYLE[status]

  return (
    <div
      className={`
        border border-line rounded-md bg-canvas overflow-hidden
        ${dragOver ? 'ring-2 ring-accent bg-blue-50' : ''}
      `}
      data-status={status}
    >
      <div className={`px-3 py-2 border-b border-line bg-subtle flex items-center gap-2 ${dragOver ? 'bg-blue-50' : ''}`}>
        <span className={`w-2 h-2 rounded-full flex-none ${style.dot}`} />
        <span className="text-xs font-semibold text-fg">
          {status === 'IN_PROGRESS' ? 'In progress' : status}
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted bg-canvas border border-line rounded px-1.5 py-0.5">
          {totalCount}
        </span>
      </div>
      <div className="board-col-scroll p-2 space-y-2 bg-canvas max-h-[calc(100vh-200px)] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="border-2 border-dashed border-line rounded-md p-4 text-center text-[10px] text-faint">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))
        )}
      </div>
    </div>
  )
}