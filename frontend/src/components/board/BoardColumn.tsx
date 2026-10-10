import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
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
  projectNames: Map<string, string>
  onTaskClick: (task: Task) => void
  /** True while the pointer is over the column during a drag. */
  dragOver: boolean
  /** A drag always ends in a click — suppress the navigation behind it. */
  shouldSuppressClick: () => boolean
}

export function BoardColumn({ status, tasks, totalCount, projectNames, onTaskClick, dragOver, shouldSuppressClick }: BoardColumnProps) {
  const style = COLUMN_STYLE[status]
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`
        border border-line rounded-md bg-canvas overflow-hidden
        ${dragOver ? 'ring-2 ring-accent bg-accentbg' : ''}
      `}
      data-status={status}
    >
      <div className={`px-3 py-2 border-b border-line bg-subtle flex items-center gap-2 ${dragOver ? 'bg-accentbg' : ''}`}>
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
          <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                projectName={task.projectId ? (projectNames.get(task.projectId) ?? null) : null}
                onClick={() => {
                  if (!shouldSuppressClick()) onTaskClick(task)
                }}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  )
}
