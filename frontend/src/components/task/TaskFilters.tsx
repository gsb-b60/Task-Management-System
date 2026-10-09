import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MultiSelect } from '../ui/Select'
import type { TaskStatus, TaskPriority } from '../../api/types'

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

interface TaskFiltersProps {
  status: TaskStatus[]
  priority: TaskPriority[]
  onStatusChange: (status: TaskStatus[]) => void
  onPriorityChange: (priority: TaskPriority[]) => void
}

export function TaskFilters({ status, priority, onStatusChange, onPriorityChange }: TaskFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  const handleStatusChange = useCallback(
    (nextStatus: TaskStatus[]) => {
      onStatusChange(nextStatus)
      const next = new URLSearchParams(searchParams)
      if (nextStatus.length > 0) {
        next.set('status', nextStatus.join(','))
      } else {
        next.delete('status')
      }
      next.set('page', '1')
      setSearchParams(next, { replace: true })
    },
    [onStatusChange, searchParams, setSearchParams],
  )

  const handlePriorityChange = useCallback(
    (nextPriority: TaskPriority[]) => {
      onPriorityChange(nextPriority)
      const next = new URLSearchParams(searchParams)
      if (nextPriority.length > 0) {
        next.set('priority', nextPriority.join(','))
      } else {
        next.delete('priority')
      }
      next.set('page', '1')
      setSearchParams(next, { replace: true })
    },
    [onPriorityChange, searchParams, setSearchParams],
  )

  const hasFilters = status.length > 0 || priority.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelect
        options={STATUS_OPTIONS}
        value={status}
        onChange={handleStatusChange}
        placeholder="Status: All"
        className="w-[160px]"
      />
      <MultiSelect
        options={PRIORITY_OPTIONS}
        value={priority}
        onChange={handlePriorityChange}
        placeholder="Priority: All"
        className="w-[160px]"
      />
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            handleStatusChange([])
            handlePriorityChange([])
          }}
          className="text-xs text-accent hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}