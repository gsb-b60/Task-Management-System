import { useLocation } from 'react-router-dom'
import { BrandMark } from '../components/ui/BrandMark'

const PHASES: Record<string, string> = {
  '/tasks': 'Phase 06 — searchable, filterable, paginated task list',
  '/board': 'Phase 07 — drag-and-drop board with rollback on failure',
  '/projects': 'Phase 08 — project CRUD and the switcher',
}

/**
 * A visible marker rather than a blank screen, so the route is demonstrably
 * wired while the feature itself is still scheduled.
 */
export function PlaceholderPage() {
  const { pathname } = useLocation()
  const planned = PHASES[pathname] ?? 'Scheduled for a later phase'

  return (
    <div className="border border-line rounded-md px-4 py-10 text-center">
      <BrandMark size="md" className="mx-auto" />
      <h1 className="mt-3 text-base font-semibold text-fg capitalize">
        {pathname.replace('/', '') || 'Home'}
      </h1>
      <p className="text-xs text-muted mt-1">{planned}</p>
      <p className="text-[11px] text-faint mt-3 font-mono">
        The route, guard and shell are live. The data view is not built yet.
      </p>
    </div>
  )
}