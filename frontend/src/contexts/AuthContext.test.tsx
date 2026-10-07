import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from '../api/client'
import type { AuthApi } from '../api/auth'
import { AuthProvider } from './AuthContext'
import { useAuth } from './auth-context'

const demoUser = { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace' }

const signedOut: AuthApi = {
  me: async () => {
    throw new ApiError('UNAUTHENTICATED', 'Not signed in.', 401, [])
  },
  login: async () => demoUser,
  register: async () => demoUser,
  logout: async () => undefined,
  githubAuthorizeUrl: () => '/auth/github/callback?code=mock-code',
}

const signedIn: AuthApi = { ...signedOut, me: async () => demoUser }

function AuthProbe() {
  const { status, user, login, logout } = useAuth()

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user ? user.email : 'none'}</p>
      <button type="button" onClick={() => void login({ email: 'ada@example.com', password: 'pw' })}>
        login
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  )
}

function renderWithApi(api: AuthApi) {
  return render(
    <AuthProvider api={api}>
      <AuthProbe />
    </AuthProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthContext', () => {
  it('starts in the loading state, before the session check resolves', () => {
    renderWithApi({ ...signedOut, me: () => new Promise(() => {}) })

    expect(screen.getByTestId('status')).toHaveTextContent('loading')
  })

  it('becomes authenticated when /me returns a user', async () => {
    renderWithApi(signedIn)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('ada@example.com')
  })

  it('treats a 401 from /me as a normal signed-out state, not an error', async () => {
    renderWithApi(signedOut)

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })

  it('holds the user in state after a successful login', async () => {
    renderWithApi(signedOut)

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'))
    await userEvent.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('ada@example.com')
  })

  it('clears the user on logout', async () => {
    const logout = vi.fn(async () => undefined)
    renderWithApi({ ...signedIn, logout })

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    await userEvent.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(logout).toHaveBeenCalledOnce()
  })

  it('keeps waiting rather than signing the user out when the check itself fails', async () => {
    renderWithApi({
      ...signedOut,
      me: async () => {
        throw new ApiError('INTERNAL_ERROR', 'Could not reach the server.', 500)
      },
    })

    // Not 'unauthenticated': an outage is not a sign-out, and bouncing to the
    // login form would just fail there too.
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('loading')
    })
  })
})

/**
 * A live session can expire mid-visit. Every 401 from any endpoint must clear
 * the session in one place, rather than leaving each component to notice.
 */
function ExpiryProbe() {
  const { status } = useAuth()
  const [requested, setRequested] = useState(false)

  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="requested">{String(requested)}</p>
      <button
        type="button"
        onClick={async () => {
          await request('/tasks').catch(() => setRequested(true))
        }}
      >
        fetch tasks
      </button>
    </div>
  )
}

describe('401 interceptor', () => {
  it('signs the user out when any endpoint answers 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Session expired.' } }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    render(
      <AuthProvider api={signedIn}>
        <ExpiryProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))

    await userEvent.click(screen.getByRole('button', { name: 'fetch tasks' }))

    expect(await screen.findByTestId('requested')).toHaveTextContent('true')
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
  })
})