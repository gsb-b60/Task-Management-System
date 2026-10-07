import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Shared open/close plumbing for the shell menus. Closes on outside click and
 * on Escape, because the drawer and both menus are keyboard-reachable and
 * cannot depend on hover to dismiss.
 */
export function useMenu() {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return { ref, open, setOpen, close, toggle: () => setOpen((value) => !value) }
}