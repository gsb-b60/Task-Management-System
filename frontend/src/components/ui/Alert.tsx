import type { ReactNode } from 'react'
import { IconAlert, IconInfo } from './Icons'

type Kind = 'error' | 'warning' | 'info'

const KINDS: Record<Kind, { wrap: string; icon: string; Icon: typeof IconAlert }> = {
  error: {
    wrap: 'border border-bad rounded-md bg-badbg px-3 py-2.5',
    icon: 'w-4 h-4 text-bad mt-0.5 flex-none',
    Icon: IconAlert,
  },
  warning: {
    wrap: 'border border-warn rounded-md bg-warnbg px-3 py-2.5',
    icon: 'w-4 h-4 text-warn mt-0.5 flex-none',
    Icon: IconAlert,
  },
  info: {
    wrap: 'border border-line rounded-md bg-subtle px-3 py-2 text-muted',
    icon: 'w-4 h-4 text-muted mt-0.5 flex-none',
    Icon: IconInfo,
  },
}

export type AlertProps = {
  kind: Kind
  /** Bold lead line, e.g. "Email is already in use." */
  title?: string
  children: ReactNode
  className?: string
}

export function Alert({ kind, title, children, className = '' }: AlertProps) {
  const { wrap, icon, Icon } = KINDS[kind]
  const bodyTone = kind === 'error' ? 'text-bad' : kind === 'warning' ? 'text-warn' : 'text-muted'

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`${wrap} flex items-start gap-2 ${className}`}
    >
      <Icon className={icon} />
      <div className={`text-xs ${bodyTone} min-w-0`}>
        {title && <div className="font-semibold">{title}</div>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  )
}