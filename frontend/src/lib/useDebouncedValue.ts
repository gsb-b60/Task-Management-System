import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of `value` that updates after `delayMs`
 * of inactivity. Useful for search inputs to avoid firing a request
 * on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}