import { forwardRef, useState, useEffect, useRef } from 'react'
import { IconChevronDown } from '../ui/Icons'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly SelectOption[]
  placeholder?: string
  multiple?: boolean
}

/**
 * Styled `<select>` matching the design tokens. Supports `multiple`
 * for multi-select filters (Phase 06).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, multiple, className = '', ...props }, ref) => (
    <select
      ref={ref}
      multiple={multiple}
      className={`
        w-full border border-line rounded-md bg-canvas text-fg
        px-2.5 py-1.5 text-sm
        focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
        ${multiple ? 'min-h-[72px] py-1' : ''}
        ${className}
      `}
      {...props}
    >
      {placeholder && !multiple && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
)

Select.displayName = 'Select'

interface MultiSelectProps<T extends string = string> {
  options: readonly SelectOption[]
  value: T[]
  onChange: (value: T[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Multi-select with checkbox-style dropdown (Phase 06 TaskFilters).
 * Renders as a trigger button + popover with checkboxes.
 */
export function MultiSelect<T extends string = string>({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  disabled,
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggle = (optValue: T) => {
    const next = value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue]
    onChange(next)
  }

  const selectedLabels = options
    .filter((o) => value.includes(o.value as T))
    .map((o) => o.label)

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          w-full border border-line rounded-md bg-canvas text-left
          px-2.5 py-1.5 text-sm
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${value.length > 0 ? 'text-fg' : 'text-faint'}
        `}
      >
        <span className="flex items-center justify-between">
          {value.length > 0 ? (
            <>
              {selectedLabels.slice(0, 2).join(', ')}
              {value.length > 2 && <span className="ml-1 text-faint">+{value.length - 2}</span>}
            </>
          ) : (
            <span className="text-faint">{placeholder ?? 'Select…'}</span>
          )}
          <IconChevronDown className={`w-3.5 h-3.5 text-faint ml-2 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full border border-line rounded-md bg-canvas shadow-lg overflow-hidden">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-subtle cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value as T)}
                onChange={() => toggle(opt.value as T)}
                className="w-3.5 h-3.5 accent-accent border-line rounded"
              />
              <span className="text-sm text-fg">{opt.label}</span>
            </label>
          ))}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-2.5 py-1.5 text-sm text-accent hover:bg-subtle border-t border-line"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}