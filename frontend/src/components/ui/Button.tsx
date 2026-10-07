import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'neutral'
type Size = 'md' | 'sm'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Label while `loading` is true, e.g. "Creating account…". */
  loadingLabel?: string
}

const BASE =
  'rounded-md font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ok text-white hover:bg-ok-dark disabled:bg-ok/40 disabled:hover:bg-ok/40',
  neutral:
    'border border-line text-fg bg-canvas hover:bg-subtle font-medium disabled:text-faint disabled:hover:bg-canvas',
}

const SIZES: Record<Size, string> = {
  md: 'w-full px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${loading ? 'opacity-70' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner className="w-3.5 h-3.5" />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}