import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { IconAlert } from './Icons'

type FieldProps = {
  label: string
  htmlFor: string
  error?: string
  helper?: ReactNode
  children: ReactNode
  /** Right-aligned note on the label row, e.g. the login page's reset hint. */
  labelAside?: ReactNode
}

export function Field({ label, htmlFor, error, helper, children, labelAside }: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-fg">
          {label}
        </label>
        {labelAside}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-bad mt-1 flex items-center gap-1" role="alert">
          <IconAlert className="w-3.5 h-3.5 flex-none" />
          {error}
        </p>
      ) : (
        helper && <p className="text-xs text-faint mt-1">{helper}</p>
      )}
    </div>
  )
}

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id?: string
  invalid?: boolean
}

const CONTROL =
  'w-full border rounded-md px-3 py-2 text-sm text-fg bg-canvas placeholder:text-faint focus:outline-none'

export function TextInput({ id, invalid = false, disabled = false, className = '', ...props }: TextInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const state = disabled
    ? 'border border-line bg-inset text-fg'
    : invalid
      ? 'border border-bad bg-canvas focus:ring-2 focus:ring-bad'
      : 'border border-line bg-canvas focus:ring-2 focus:ring-accent focus:border-accent'

  return (
    <input
      id={inputId}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${state} ${className}`}
      {...props}
    />
  )
}