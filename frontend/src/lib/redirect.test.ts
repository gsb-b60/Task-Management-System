import { describe, expect, it } from 'vitest'
import { isUnauthenticated, redirectFromSearch, safeRedirect } from './redirect'
import { ApiError } from '../api/client'

describe('safeRedirect', () => {
  it('keeps a local path', () => {
    expect(safeRedirect('/tasks?status=TODO')).toBe('/tasks?status=TODO')
  })

  it('falls back when there is nothing to return to', () => {
    expect(safeRedirect(null)).toBe('/dashboard')
    expect(safeRedirect(undefined)).toBe('/dashboard')
    expect(safeRedirect('')).toBe('/dashboard')
  })

  it('refuses a protocol-relative URL, which would leave the origin', () => {
    // Otherwise `/login?redirect=//evil.com` is an open redirect that carries
    // the session off-site.
    expect(safeRedirect('//evil.com')).toBe('/dashboard')
    expect(safeRedirect('/\\evil.com')).toBe('/dashboard')
  })

  it('refuses an absolute URL', () => {
    expect(safeRedirect('https://evil.com/steal')).toBe('/dashboard')
    expect(safeRedirect('http://evil.com')).toBe('/dashboard')
    expect(safeRedirect('javascript:alert(1)')).toBe('/dashboard')
  })

  it('refuses a relative path that is not rooted', () => {
    expect(safeRedirect('tasks')).toBe('/dashboard')
  })

  it('refuses an injected header break', () => {
    expect(safeRedirect('/tasks\r\nSet-Cookie: a=b')).toBe('/dashboard')
  })

  it('honours a custom fallback', () => {
    expect(safeRedirect(null, '/login')).toBe('/login')
  })
})

describe('redirectFromSearch', () => {
  it('reads and sanitises ?redirect=', () => {
    expect(redirectFromSearch('?redirect=%2Ftasks%3Fstatus%3DTODO')).toBe('/tasks?status=TODO')
  })

  it('rejects an unsafe value from the query string', () => {
    expect(redirectFromSearch('?redirect=%2F%2Fevil.com')).toBe('/dashboard')
  })

  it('falls back when absent', () => {
    expect(redirectFromSearch('')).toBe('/dashboard')
  })
})

describe('isUnauthenticated', () => {
  it('is true only for a 401', () => {
    expect(isUnauthenticated(new ApiError('UNAUTHENTICATED', 'Not signed in.', 401))).toBe(true)
    expect(isUnauthenticated(new ApiError('FORBIDDEN', 'Nope.', 403))).toBe(false)
    expect(isUnauthenticated(new Error('boom'))).toBe(false)
    expect(isUnauthenticated(undefined)).toBe(false)
  })
})