import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MultiSelect, Select } from '../ui/Select'
import { formatProjectLabel } from '../../lib/format'
import type { ProjectListItem, TaskStatus, TaskPriority } from '../../api/types'

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
  projectId: string | null
  projects: ProjectListItem[]
  onProjectChange: (projectId: string | null) => void
}

export function TaskFilters({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
  projectId,
  projects,
  onProjectChange,
}: TaskFiltersProps) {
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

  const handleProjectChange = useCallback(
    (nextProjectId: string | null) => {
      onProjectChange(nextProjectId)
      const next = new URLSearchParams(searchParams)
      if (nextProjectId) {
        next.set('projectId', nextProjectId)
      } else {
        next.delete('projectId')
      }
      next.set('page', '1')
      setSearchParams(next, { replace: true })
    },
    [onProjectChange, searchParams, setSearchParams],
  )

  const hasFilters = status.length > 0 || priority.length > 0 || projectId !== null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-[180px]">
        <Select
          aria-label="Filter by project"
          value={projectId ?? ''}
          onChange={(e) => handleProjectChange(e.target.value || null)}
          options={[
            { value: '', label: 'Project: All' },
            ...projects.map((p) => ({ value: p.id, label: formatProjectLabel(p.projectNumber, p.name) })),
          ]}
        />
      </div>
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
            handleProjectChange(null)
          }}
          className="text-xs text-accent hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}