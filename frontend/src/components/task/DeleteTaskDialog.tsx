import { AlertDialog } from '../ui/Dialog'
import type { Task } from '../../api/types'

interface DeleteTaskDialogProps {
  open: boolean
  onClose: () => void
  task: Task | null
  onConfirm: () => void
  isLoading?: boolean
}

export function DeleteTaskDialog({ open, onClose, task, onConfirm, isLoading }: DeleteTaskDialogProps) {
  if (!task || !open) return null

  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      title="Delete task"
      message={`Delete "${task.title}"? This cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      variant="destructive"
      loading={isLoading}
    />
  )
}