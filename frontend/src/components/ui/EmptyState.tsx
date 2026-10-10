import { IconInbox } from '../ui/Icons'

interface EmptyStateProps {
  title: string
  message: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/**
 * Consistent empty state used by Task List, Dashboard, Board, Projects.
 */
export function EmptyState({
  title,
  message,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`border border-line rounded-md p-8 text-center ${className}`}>
      <div className="inline-flex w-12 h-12 rounded-full border border-line bg-subtle items-center justify-center mb-3">
        {icon ?? <IconInbox className="w-5 h-5 text-faint" />}
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="text-xs text-muted mt-1 max-w-xs mx-auto">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}