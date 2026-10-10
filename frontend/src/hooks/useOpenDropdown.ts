import { useCallback } from 'react'
import type { RefCallback } from 'react'

/**
 * Drop the user straight into an open native dropdown on mount. showPicker is
 * Chromium-only and needs the opening click's user gesture — everywhere else
 * this is a no-op and the already-focused select opens with one keypress.
 * Stable across renders so the picker is not re-triggered spuriously.
 */
export function useOpenDropdown(): RefCallback<HTMLSelectElement> {
  return useCallback((el: HTMLSelectElement | null) => {
    if (!el) return
    try {
      el.showPicker()
    } catch {
      // No user gesture or unsupported browser — stay focused instead.
    }
  }, [])
}
