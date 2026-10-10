import { AlertDialog } from '../ui/Dialog'
import { formatProjectLabel } from '../../lib/format'
import type { ProjectListItem } from '../../api/types'

interface DeleteProjectDialogProps {
  open: boolean
  onClose: () => void
  project: ProjectListItem | null
  onConfirm: () => void
  isLoading?: boolean
}

export function DeleteProjectDialog({ open, onClose, project, onConfirm, isLoading }: DeleteProjectDialogProps) {
  if (!project || !open) return null

  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      title="Delete project"
      message={`Delete "${formatProjectLabel(project.projectNumber, project.name)}"? This will also delete all ${project.taskCount} tasks in this project. This cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      variant="destructive"
      loading={isLoading}
    />
  )
}