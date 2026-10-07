import { describe, expect, it } from 'vitest'
import { isApiError } from '../client'
import { mockAuthApi } from './auth'
import { DEMO_EMAIL, DEMO_PASSWORD, resetDb } from './db'

describe('mock auth', () => {
  it('registers, signs in and returns the user', async () => {
    const user = await mockAuthApi.register({
      email: 'grace@example.com',
      password: 'sup3rsecret',
      displayName: 'Grace',
    })

    expect(user.email).toBe('grace@example.com')
    expect(user.displayName).toBe('Grace')

    // Register already established the session, so /me resolves without a login.
    await expect(mockAuthApi.me()).resolves.toMatchObject({ email: 'grace@example.com' })
  })

  it('lowercases the email so sign-in is case-insensitive', async () => {
    await mockAuthApi.register({ email: 'Grace@Example.com', password: 'sup3rsecret' })

    await expect(mockAuthApi.login({ email: 'grace@example.com', password: 'sup3rsecret' })).resolves.toMatchObject(
      { email: 'grace@example.com' },
    )
  })

  it('reports a duplicate email as CONFLICT against the email field', async () => {
    const error = await mockAuthApi
      .register({ email: DEMO_EMAIL, password: 'another-one' })
      .catch((thrown) => thrown)

    expect(isApiError(error)).toBe(true)
    expect(error.code).toBe('CONFLICT')
    expect(error.status).toBe(409)
    expect(error.fieldError('email')).toBe('Email is already in use.')
  })

  it('returns per-field details for a validation failure', async () => {
    const error = await mockAuthApi
      .register({ email: 'not-an-email', password: 'short' })
      .catch((thrown) => thrown)

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.details.map((detail: { field: string | null }) => detail.field)).toEqual([
      'email',
      'password',
    ])
  })

  it('never reveals whether an account exists on a failed login', async () => {
    const unknownEmail = await mockAuthApi
      .login({ email: 'nobody@example.com', password: 'sup3rsecret' })
      .catch((thrown) => thrown)

    const wrongPassword = await mockAuthApi
      .login({ email: DEMO_EMAIL, password: 'wrongpassword' })
      .catch((thrown) => thrown)

    expect(unknownEmail.code).toBe('UNAUTHENTICATED')
    expect(wrongPassword.code).toBe('UNAUTHENTICATED')
    // Byte-identical: same code, same message, same (empty) details.
    expect(wrongPassword.message).toBe('Invalid email or password.')
    expect(wrongPassword.details).toEqual(unknownEmail.details)
  })

  it('signs the seeded demo account in with the documented password', async () => {
    await expect(mockAuthApi.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD })).resolves.toMatchObject({
      email: DEMO_EMAIL,
    })
  })

  it('rate-limits after the attempt limit rather than never', async () => {
    let lastError: unknown
    for (let attempt = 0; attempt < 11; attempt += 1) {
      lastError = await mockAuthApi.login({ email: DEMO_EMAIL, password: 'wrongpassword' }).catch((thrown) => thrown)
    }

    expect(isApiError(lastError) && lastError.code).toBe('RATE_LIMITED')
  })

  it('treats logout as idempotent', async () => {
    await expect(mockAuthApi.logout()).resolves.toBeUndefined()

    resetDb()

    // No session at all: still a success, so the UI has no failure path.
    await expect(mockAuthApi.logout()).resolves.toBeUndefined()
  })

  it('clears the session on logout', async () => {
    await mockAuthApi.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    await mockAuthApi.logout()

    const error = await mockAuthApi.me().catch((thrown) => thrown)
    expect(error.status).toBe(401)
  })

  it('reports no session as 401 rather than an error the UI must special-case', async () => {
    resetDb()

    const error = await mockAuthApi.me().catch((thrown) => thrown)
    expect(isApiError(error)).toBe(true)
    expect(error.status).toBe(401)
  })

  it('omits createdAt from /me, which the session screen has no use for', async () => {
    await mockAuthApi.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD })

    const user = await mockAuthApi.me()
    expect(user.createdAt).toBeUndefined()
  })
})