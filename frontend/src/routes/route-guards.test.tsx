import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import type { AuthApi } from '../api/auth'
import { DEMO_EMAIL } from '../api/mock'
import { renderApp } from '../test/renderApp'

const demoUser = { id: 'u1', email: DEMO_EMAIL, displayName: 'Ada Lovelace' }

/** Signed in without going through a form. */
function signedIn(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    me: async () => demoUser,
    login: async () => demoUser,
    register: async () => demoUser,
    logout: async () => undefined,
    githubAuthorizeUrl: () => '/auth/github/callback?code=mock-code',
    ...overrides,
  }
}

function signedOut(): AuthApi {
  return {
    me: async () => {
      throw new ApiError('UNAUTHENTICATED', 'Not signed in.', 401, [])
    },
    login: async () => demoUser,
    register: async () => demoUser,
    logout: async () => undefined,
    githubAuthorizeUrl: () => '/auth/github/callback?code=mock-code',
  }
}

describe('ProtectedRoute', () => {
  it('redirects to /login with no session, preserving the intended path', async () => {
    const { router } = renderApp(['/tasks?status=TODO'], signedOut())

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
    expect(router.state.location.search).toBe('?redirect=%2Ftasks%3Fstatus%3DTODO')
  })

  it('shows the splash rather than the login form while the session check runs', async () => {
    let release: (() => void) | undefined
    const api = signedOut()
    const slow: AuthApi = {
      ...api,
      me: async () =>
        new Promise((_, reject) => {
          release = () => reject(new ApiError('UNAUTHENTICATED', 'Not signed in.', 401, []))
        }),
    }

    renderApp(['/dashboard'], slow)

    // No protected content and no login form: only the session check.
    expect(screen.getByText('GET /api/auth/me')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /dashboard/i })).not.toBeInTheDocument()

    release?.()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    })
  })

  it('renders protected content for a session', async () => {
    renderApp(['/dashboard'], signedIn())

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})

describe('PublicRoute', () => {
  it('sends a signed-in visitor from /login to the dashboard', async () => {
    const { router } = renderApp(['/login'], signedIn())

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/dashboard')
    })
  })

  it('lets a guest reach the login form', async () => {
    renderApp(['/login'], signedOut())

    expect(await screen.findByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })
})

describe('app shell', () => {
  it('offers every primary view in the sidebar', async () => {
    renderApp(['/dashboard'], signedIn())

    await screen.findByRole('heading', { name: 'Dashboard' })

    // The header no longer carries nav links; the sidebar owns the views.
    // Tasks renders its total beside the label, so match loosely.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /Tasks/ })).toHaveAttribute('href', '/tasks')
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/board')
    expect(screen.getByRole('link', { name: 'Roadmap' })).toHaveAttribute('href', '/roadmap')
  })

  it('returns to /login after signing out', async () => {
    const { router } = renderApp(['/dashboard'], signedIn())

    await screen.findByRole('heading', { name: 'Dashboard' })

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))

await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
  })
})

describe('404', () => {
  it('renders the not-found page for an unknown route', async () => {
    renderApp(['/nope'], signedIn())

    expect(await screen.findByText('404')).toBeInTheDocument()
    expect(screen.getByText("This page doesn't exist")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('offers a way back', async () => {
    renderApp(['/nope'], signedIn())

    await screen.findByText('404')
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })
})

describe('GitHub callback', () => {
it('waits while the exchange completes', async () => {
    // Both AuthProvider's mount check and the page itself ask /me, so the
    // cookie is read again after the backend sets it. Both must settle.
    const releases: (() => void)[] = []
    const slow: AuthApi = {
      ...signedOut(),
      me: async () =>
        new Promise((resolve) => {
          releases.push(() => resolve(demoUser))
        }),
    }

    renderApp(['/auth/github/callback?code=abc'], slow)

    expect(await screen.findByText(/Signing you in with GitHub/i)).toBeInTheDocument()

    releases.forEach((release) => release())

    await waitFor(() => {
      expect(screen.queryByText(/Signing you in with GitHub/i)).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('shows the failure state when authorisation was denied', async () => {
    renderApp(['/auth/github/callback?error=access_denied'], signedOut())

    expect(await screen.findByText('GitHub sign-in failed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Retry with GitHub' })).toBeInTheDocument()
  })
})

