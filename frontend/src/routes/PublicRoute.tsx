import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { SessionGate } from '../components/layout/SessionGate'
import { useAuth } from '../contexts/auth-context'
import { redirectFromSearch } from '../lib/redirect'

/**
 * A signed-in visitor has no business on the login or register form. Where
 * they land is the path they were originally refused, so a deep link survives
 * signing in from either form.
 */
export function PublicRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionGate />
  if (status === 'authenticated') {
    return <Navigate to={redirectFromSearch(location.search)} replace />
  }

  return <Outlet />
}