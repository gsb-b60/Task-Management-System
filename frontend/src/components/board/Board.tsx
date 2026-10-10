import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { BoardColumn } from './BoardColumn'
import { TaskCardBody } from './TaskCard'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { isBoardStatus, resolveDropStatus } from './dropStatus'
import { formatProjectLabel } from '../../lib/format'
import type { ProjectListItem, Task, TaskStatus } from '../../api/types'

interface BoardProps {
  columns: Record<TaskStatus, Task[]>
  meta: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  projects?: ProjectListItem[]
  onTaskClick: (task: Task) => void
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>
}

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

export function Board({
  columns,
  meta,
  projects = [],
  onTaskClick,
  onMoveTask,
}: BoardProps) {
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<UniqueIdentifier | null>(null)
  // A real drag ends in a synthetic click on the card — swallow it so the
  // task detail does not open behind the drop.
  const suppressClickUntil = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const shouldSuppressClick = useCallback(
    () => Date.now() < suppressClickUntil.current,
    [],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(event.active.id)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const over = event.over
    if (!over) {
      setDragOverStatus(null)
      return
    }
    const overId = String(over.id)
    setDragOverStatus(
      isBoardStatus(overId)
        ? overId
        : isBoardStatus(over.data.current?.status)
          ? over.data.current.status
          : null,
    )
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTaskId(null)
      setDragOverStatus(null)
      suppressClickUntil.current = Date.now() + 300

      if (!over) return

      const newStatus = resolveDropStatus(
        String(over.id),
        over.data.current?.status,
        active.data.current?.status,
      )
      if (!newStatus) return

      await onMoveTask(String(active.id), newStatus)
    },
    [onMoveTask],
  )

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null)
    setDragOverStatus(null)
  }, [])

  const activeTask = activeTaskId
    ? [...columns.TODO, ...columns.IN_PROGRESS, ...columns.DONE].find(
        (task) => task.id === activeTaskId,
      ) ?? null
    : null
  const projectNames = new Map(projects.map((p) => [p.id, formatProjectLabel(p.projectNumber, p.name)]))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-3 gap-3">
        {STATUS_ORDER.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={columns[status]}
            totalCount={
              status === 'TODO'
                ? meta.totalItems - columns.IN_PROGRESS.length - columns.DONE.length
                : columns[status].length
            }
            projectNames={projectNames}
            onTaskClick={onTaskClick}
            dragOver={dragOverStatus === status}
            shouldSuppressClick={shouldSuppressClick}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeTask ? (
          <div className="border border-line rounded-md p-3 bg-canvas shadow-xl cursor-grabbing rotate-1">
            <TaskCardBody
              task={activeTask}
              projectName={
                activeTask.projectId ? (projectNames.get(activeTask.projectId) ?? null) : null
              }
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
