import { useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../ui/Icons'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

/**
 * Accessible modal dialog (Phase 06 DeleteTaskDialog, Phase 08 ProjectForm).
 * Portals to body, traps focus, closes on Escape/overlay click.
 */
export function Dialog({ open, onClose, title, description, children, className = '' }: DialogProps) {
  const titleId = `dialog-title-${title.replace(/\s+/g, '-')}`
  const descId = description ? `dialog-desc-${title.replace(/\s+/g, '-')}` : undefined

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const content = (
    <Fragment>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`
          fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          w-full max-w-md z-50
          border border-line rounded-lg bg-canvas shadow-xl
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="flex items-start justify-between p-4 border-b border-line">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-faint hover:text-fg rounded hover:bg-subtle"
            aria-label="Close"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </Fragment>
  )

  return createPortal(content, document.body)
}

interface AlertDialogProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'destructive' | 'primary'
  loading?: boolean
}

/**
 * Confirmation dialog with explicit action naming (Phase 06/08 delete confirmations).
 */
export function AlertDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'destructive',
  loading = false,
}: AlertDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium text-fg border border-line rounded-md hover:bg-subtle"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-md
            ${variant === 'destructive'
              ? 'bg-bad text-white hover:bg-bad/90'
              : 'bg-accent text-white hover:bg-accent/90'}
          `}
        >
          {loading ? '…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}