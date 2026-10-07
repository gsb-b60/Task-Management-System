import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, isApiError, request, setUnauthorizedHandler } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('unwraps the data envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'u1', email: 'ada@example.com' } }))

    await expect(request('/auth/me')).resolves.toEqual({ id: 'u1', email: 'ada@example.com' })
  })

  it('sends the session cookie on every request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }))

    await request('/tasks')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/tasks'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('serialises the body and sets a JSON content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 'u1' } }, 201))

    await request('/auth/login', { method: 'POST', body: { email: 'ada@example.com' } })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ email: 'ada@example.com' }))
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('throws an ApiError carrying code, message and details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request failed validation.',
            details: [{ field: 'email', message: 'Must be a valid email address.' }],
          },
        },
        400,
      ),
    )

    const error = await request('/auth/login', { method: 'POST', body: {} }).catch((thrown) => thrown)

    expect(isApiError(error)).toBe(true)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.status).toBe(400)
    expect(error.message).toBe('Request failed validation.')
    expect(error.details).toHaveLength(1)
    expect(error.fieldError('email')).toBe('Must be a valid email address.')
    expect(error.fieldError('password')).toBeUndefined()
  })

  it('falls back to a code derived from the status when the envelope is missing', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 409 }))

    const error = await request('/auth/register', { method: 'POST', body: {} }).catch((thrown) => thrown)

    expect(error.code).toBe('CONFLICT')
    expect(error.status).toBe(409)
    expect(error.details).toEqual([])
  })

  it('returns undefined for 204, which logout relies on', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(request('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })

  describe('401 handling', () => {
    it('fires the unauthorized handler', async () => {
      const onUnauthorized = vi.fn()
      setUnauthorizedHandler(onUnauthorized)
      fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Session expired.' } }, 401))

      await request('/tasks').catch(() => undefined)

      expect(onUnauthorized).toHaveBeenCalledOnce()
    })

    it('stays quiet when the caller expects it', async () => {
      const onUnauthorized = vi.fn()
      setUnauthorizedHandler(onUnauthorized)
      fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in.' } }, 401))

      // The initial session check treats a 401 as a normal state, not an expiry.
      await request('/auth/me', { expectUnauthenticated: true }).catch(() => undefined)

      expect(onUnauthorized).not.toHaveBeenCalled()
    })
  })

  it('turns a network failure into an ApiError rather than a raw TypeError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await request('/tasks').catch((thrown) => thrown)

    expect(isApiError(error)).toBe(true)
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.status).toBe(0)
  })
})