import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../api'
import { CenteredPanel } from '../../components/layout/CenteredPanel'
import { IconAlert } from '../../components/ui/Icons'
import { Spinner } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/auth-context'
import { queryKeys } from '../../lib/queryKeys'
import { redirectFromSearch } from '../../lib/redirect'

/**
 * Public route. It waits for the backend to finish the OAuth exchange, then
 * lets the session check decide whether to continue into the protected area.
 */
export function GitHubCallbackPage() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [exchangeFailed, setExchangeFailed] = useState(false)

  // Derived, not state: a denial is known from the first render.
  const errorCode = searchParams.get('error')
  const denied = errorCode !== null
  const failed = denied || exchangeFailed
  // The backend forwards OAuth `state` as `?redirect=` so a deep link
  // (e.g. /login?redirect=/board) survives the GitHub round-trip.
  const returnTo = redirectFromSearch(searchParams.toString())
  const returnQuery = returnTo === '/dashboard' ? '' : `?redirect=${encodeURIComponent(returnTo)}`

  useEffect(() => {
    if (denied) return

    let cancelled = false
    void refreshUser()
      .then((user) => {
        if (cancelled) return
        // The session may now carry a GitHub token, so drop the cached
        // "not connected" state and let the sidebar refetch immediately.
        void queryClient.invalidateQueries({ queryKey: queryKeys.githubRateLimit() })
        navigate(user ? redirectFromSearch(searchParams.toString()) : '/login', { replace: true })
      })
      .catch(() => {
        if (!cancelled) setExchangeFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [denied, refreshUser, navigate, queryClient, searchParams])

  if (failed) {
    const message =
      errorCode === 'oauth_not_configured'
        ? 'GitHub sign-in is not configured on the server. Ask an admin to set GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET.'
        : errorCode === 'exchange_failed' || exchangeFailed
          ? 'The code exchange failed. Try again — codes expire after a few minutes.'
          : 'Authorisation was denied. No account was linked.'
    return (
      <CenteredPanel>
        <div className="text-center">
          <span className="inline-flex w-10 h-10 rounded-full border border-bad bg-badbg items-center justify-center">
            <IconAlert className="w-5 h-5 text-bad" />
          </span>
          <h1 className="mt-3 text-base font-semibold text-fg">GitHub sign-in failed</h1>
          <p className="text-xs text-muted mt-1">{message}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <a
              href={`/login${returnQuery}`}
              className="border border-line rounded-md px-3 py-1.5 text-xs font-medium text-fg bg-canvas hover:bg-subtle"
            >
              Back to sign in
            </a>
            <a
              href={authApi.githubAuthorizeUrl(returnTo === '/dashboard' ? undefined : returnTo)}
              className="bg-ok text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-ok-dark"
            >
              Retry with GitHub
            </a>
          </div>
        </div>
      </CenteredPanel>
    )
  }

  return (
    <CenteredPanel>
      <div className="text-center">
        <Spinner className="w-7 h-7 mx-auto text-fg" />
        <h1 className="mt-4 text-base font-semibold text-fg">Signing you in with GitHub…</h1>
        <p className="text-xs text-muted mt-1">
          Exchanging the authorisation code for a session.
        </p>
      </div>
    </CenteredPanel>
  )
}