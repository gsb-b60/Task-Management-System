import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconSearch } from '../ui/Icons'

interface TaskSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TaskSearch({ value, onChange, placeholder = 'Search by title…', className = '' }: TaskSearchProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target.value
      onChange(nextValue)
      const next = new URLSearchParams(searchParams)
      if (nextValue) {
        next.set('q', nextValue)
      } else {
        next.delete('q')
      }
      next.set('page', '1')
      setSearchParams(next, { replace: true })
    },
    [onChange, searchParams, setSearchParams],
  )

  const handleClear = useCallback(() => {
    onChange('')
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    next.set('page', '1')
    setSearchParams(next, { replace: true })
  }, [onChange, searchParams, setSearchParams])

  return (
    <div className="relative">
      <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`
          w-full pl-9 pr-8 py-1.5 text-sm
          border border-line rounded-md bg-canvas text-fg
          placeholder:text-faint
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent
          ${className}
        `}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-faint hover:text-fg"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  )
}