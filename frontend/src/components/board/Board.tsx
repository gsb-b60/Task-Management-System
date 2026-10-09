import { useState, useCallback } from 'react'
import {
  DndContext,
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
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { BoardColumn } from './BoardColumn'
import type { Task, TaskStatus } from '../../api/types'

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
  onTaskClick: (task: Task) => void
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>
}

const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

export function Board({
  columns,
  meta,
  onTaskClick,
  onMoveTask,
}: BoardProps) {
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<UniqueIdentifier | null>(null)

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(event.active.id)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (event.over && event.over.id !== activeTaskId) {
        const status = event.over.id as TaskStatus
        if (['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
          setDragOverStatus(status)
        }
      } else {
        setDragOverStatus(null)
      }
    },
    [activeTaskId],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTaskId(null)
      setDragOverStatus(null)

      if (!over || active.id === over.id) return

      const taskId = String(active.id)
      const newStatus = String(over.id) as TaskStatus

      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(newStatus)) return

      await onMoveTask(taskId, newStatus)
    },
    [onMoveTask],
  )

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null)
    setDragOverStatus(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={STATUS_ORDER}
        strategy={verticalListSortingStrategy}
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
              onTaskClick={onTaskClick}
              dragOver={dragOverStatus === status}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}