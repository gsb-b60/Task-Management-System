import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/ui/BrandMark'
import { IconArrowLeft } from '../components/ui/Icons'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="grid place-items-center min-h-screen bg-canvas">
      <div className="text-center px-6">
        <BrandMark size="md" className="mx-auto" />
        <p className="font-mono text-5xl font-semibold text-inset select-none mt-4">404</p>
        <h1 className="mt-3 text-base font-semibold text-fg">This page doesn't exist</h1>
        <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
          The page may have been moved, or the link may be mistyped. Nothing you own was deleted.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border border-line rounded px-3 py-1.5 text-xs font-medium text-fg bg-canvas hover:bg-subtle flex items-center gap-1.5"
          >
            <IconArrowLeft className="w-3.5 h-3.5" />
            Go back
          </button>
          <Link
            to="/dashboard"
            className="bg-ok text-white rounded px-3 py-1.5 text-xs font-semibold hover:bg-ok-dark"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}