import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import type { AuthApi, LoginInput, RegisterInput } from '../../api/auth'
import { mockAuthApi } from '../../api/mock'
import { renderApp } from '../../test/renderApp'

const demoUser = { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace' }

describe('RegisterPage', () => {
  it('blocks submission on an invalid email and sends no request', async () => {
    const api = spyApi()
    renderApp(['/register'], api.api)

    await userEvent.type(await screen.findByLabelText('Name'), 'Ada')
    await userEvent.type(await screen.findByLabelText('Email'), 'not-an-email')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(api.calls.register).not.toHaveBeenCalled()
  })

  it('requires a password of at least 8 characters', async () => {
    const api = spyApi()
    renderApp(['/register'], api.api)

    await userEvent.type(await screen.findByLabelText('Name'), 'Ada')
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'short')
    await userEvent.click(await screen.findByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(api.calls.register).not.toHaveBeenCalled()
  })

  it('signs the user in and redirects to the requested path', async () => {
    const api = spyApi()
    const { router } = renderApp(['/register?redirect=%2Ftasks%3Fstatus%3DTODO'], api.api)

    await userEvent.type(await screen.findByLabelText('Name'), 'Ada')
    await userEvent.type(await screen.findByLabelText('Email'), 'grace@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/tasks')
    })
    expect(api.calls.register).toHaveBeenCalledOnce()
  })

  it('marks the email field on 409, branching on the code rather than the message', async () => {
    const api = spyApi({
      register: async () => {
        throw new ApiError('CONFLICT', 'Email is already in use.', 409, [
          { field: 'email', message: 'Email is already in use.' },
        ])
      },
    })
    renderApp(['/register'], api.api)

    await userEvent.type(await screen.findByLabelText('Name'), 'Ada')
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /create account/i }))

    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Email is already in use.')
    // The same sentence appears as the field error and in the banner.
    expect(screen.getAllByText(/Email is already in use\./).length).toBeGreaterThanOrEqual(2)
  })

  it('routes each server detail onto its own field', async () => {
    const api = spyApi({
      register: async () => {
        throw new ApiError('VALIDATION_ERROR', 'Request failed validation.', 400, [
          { field: 'displayName', message: 'Name must be at least 2 characters.' },
          { field: 'password', message: 'Password must include a number.' },
        ])
      },
    })
    renderApp(['/register'], api.api)

    await userEvent.type(await screen.findByLabelText('Name'), 'Ada')
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Name must be at least 2 characters.')).toBeInTheDocument()
    expect(screen.getByText('Password must include a number.')).toBeInTheDocument()
    // Neither field error invents an email problem the server did not report.
    expect(screen.queryByText(/valid email address/i)).not.toBeInTheDocument()
  })

  it('disables submit while the request is in flight', async () => {
    let release: (() => void) | undefined
    const api = spyApi({
      register: async () =>
        new Promise<typeof demoUser>((resolve) => {
          release = () => resolve(demoUser)
        }),
    })
    renderApp(['/register'], api.api)

    await userEvent.type(await screen.findByLabelText('Name'), 'Ada')
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /create account/i }))

    const button = await screen.findByRole('button', { name: /creating account/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    release?.()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /creating account/i })).not.toBeInTheDocument()
    })
  })

  it('links to sign in for an existing account', async () => {
    renderApp(['/register'], spyApi().api)

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})

describe('LoginPage', () => {
  it('shows a generic message on 401 and marks neither field', async () => {
    const api = spyApi({
      login: async () => {
        throw new ApiError('UNAUTHENTICATED', 'Invalid email or password.', 401, [])
      },
    })
    renderApp(['/login'], api.api)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /^sign in$/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Invalid email or password.')

    expect(await screen.findByLabelText('Email')).not.toHaveAttribute('aria-invalid', 'true')
    expect(await screen.findByLabelText('Password')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the rate-limit warning on 429', async () => {
    const api = spyApi({
      login: async () => {
        throw new ApiError('RATE_LIMITED', 'Too many attempts.', 429, [
          { field: null, message: 'Attempt 10 of 10 before the account is locked.' },
        ])
      },
    })
    renderApp(['/login'], api.api)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /^sign in$/i }))

    const alert = await screen.findByRole('status')
    expect(alert).toHaveTextContent('Too many attempts.')
    expect(alert).toHaveTextContent('Attempt 10 of 10')
  })

  it('notes the pending redirect without leaking the raw URL', async () => {
    renderApp(['/login?redirect=%2Ftasks'], spyApi().api)

    expect(
      await screen.findByText('Signing you in — you will land back where you left off.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('/tasks')).not.toBeInTheDocument()
  })

  it('returns the user to the path they originally requested', async () => {
    const api = spyApi({
      login: async () => demoUser,
      me: async () => demoUser,
    })
    const { router } = renderApp(['/login?redirect=%2Fboard'], api.api)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/board')
    })
  })

  it('disables submit while the request is in flight', async () => {
    let release: (() => void) | undefined
    const api = spyApi({
      login: async () =>
        new Promise<typeof demoUser>((resolve) => {
          release = () => resolve(demoUser)
        }),
    })
    renderApp(['/login'], api.api)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'sup3rsecret')
    await userEvent.click(await screen.findByRole('button', { name: /^sign in$/i }))

    const button = await screen.findByRole('button', { name: /signing in/i })
    expect(button).toBeDisabled()

    release?.()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /signing in/i })).not.toBeInTheDocument()
    })
  })

  it('sends a real sign-in through the mock layer', async () => {
    // mockAuthApi.me() reports a signed-in user, so fail the initial session
    // check once to start logged out; login() still returns the mock user.
    vi.spyOn(mockAuthApi, 'me').mockRejectedValueOnce(
      new ApiError('UNAUTHENTICATED', 'Not signed in.', 401, []),
    )
    renderApp(['/login'], mockAuthApi)

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await userEvent.type(await screen.findByLabelText('Password'), 'taskstream1')
    await userEvent.click(await screen.findByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText('Task Stream')).toBeInTheDocument()
  })
})

interface Spy {
  api: AuthApi
  calls: { register: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn> }
}

/** Wraps the mock layer so individual specs can override one call. */
function spyApi(overrides: Partial<AuthApi> = {}): Spy {
  const calls = { register: vi.fn(), login: vi.fn() }

  const api: AuthApi = {
    me: async () => {
      throw new ApiError('UNAUTHENTICATED', 'Not signed in.', 401, [])
    },
    logout: vi.fn(async () => undefined),
    githubAuthorizeUrl: () => '/auth/github/callback?code=mock-code',
    register: async (input: RegisterInput) => {
      calls.register(input)
      return (overrides.register ?? mockAuthApi.register)(input)
    },
    login: async (input: LoginInput) => {
      calls.login(input)
      return (overrides.login ?? mockAuthApi.login)(input)
    },
  }

  return { api, calls }
}