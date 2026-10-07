import { useAuth } from '../../contexts/auth-context'
import { Splash } from '../ui/Spinner'
import { IconRetry } from '../ui/Icons'

/**
 * Blocks rendering until the session check resolves, and distinguishes "still
 * checking" from "could not check". Without the split, an API outage either
 * flashes the login form or shows a spinner forever.
 */
export function SessionGate() {
  const { sessionCheckError, refreshUser } = useAuth()

  if (!sessionCheckError) return <Splash />

  return (
    <div className="min-h-screen grid place-items-center bg-canvas">
      <div className="text-center px-6">
        <h1 className="text-base font-semibold text-fg">Could not verify your session</h1>
        <p className="text-xs text-muted mt-1 max-w-xs">
          {sessionCheckError.message} You have not been signed out.
        </p>
        <button
          type="button"
          onClick={() => void refreshUser()}
          className="mt-3 border border-line rounded-md px-3 py-1.5 text-xs font-medium text-fg bg-canvas hover:bg-subtle inline-flex items-center gap-1.5"
        >
          <IconRetry className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    </div>
  )
}