import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { SessionGate } from '../components/layout/SessionGate'
import { useAuth } from '../contexts/auth-context'

/**
 * The intended path travels in `?redirect=` so a deep link survives the trip
 * through the login form.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionGate />

  if (status === 'unauthenticated') {
    const target = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />
  }

  return <Outlet />
}