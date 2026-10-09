import { Select } from '../ui/Select'
import type { TaskStatus } from '../../api/types'

interface BoardCardStatusControlProps {
  taskId: string
  currentStatus: TaskStatus
  onChange: (taskId: string, status: TaskStatus) => void
  disabled?: boolean
}

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
] as const

export function BoardCardStatusControl({
  taskId,
  currentStatus,
  onChange,
  disabled,
}: BoardCardStatusControlProps) {
  return (
    <Select
      id={`status-${taskId}`}
      value={currentStatus}
      onChange={(e) => onChange(taskId, e.target.value as TaskStatus)}
      options={STATUS_OPTIONS}
      placeholder="Status"
      disabled={disabled}
      className="w-full text-[10px]"
    />
  )
}