import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api'
import { setUnauthorizedHandler } from '../api/client'
import { isUnauthenticated } from '../lib/redirect'
import { AuthContext } from './auth-context'
import type { AuthProviderProps, AuthStatus } from './auth-context'
import type { LoginInput, RegisterInput } from '../api/auth'
import type { User } from '../api/types'

/**
 * The session lives in an HttpOnly cookie, so there is no token here to hold
 * or refresh — `GET /auth/me` is the only source of truth, and a `401` from it
 * is a normal state rather than an error to surface.
 */
export function AuthProvider({ children, api = authApi }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [sessionCheckError, setSessionCheckError] = useState<Error | null>(null)

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const current = await api.me()
      setUser(current)
      setStatus('authenticated')
      setSessionCheckError(null)
      return current
    } catch (error) {
      setUser(null)
      if (isUnauthenticated(error)) {
        setStatus('unauthenticated')
        setSessionCheckError(null)
        return null
      }
      // A 500 or a dead network is not "signed out". Reporting it as such
      // would bounce a signed-in user to the login form, which would then
      // fail too — so the gate keeps waiting and offers a retry instead.
      setSessionCheckError(error instanceof Error ? error : new Error('Session check failed'))
      throw error
    }
  }, [api])

  useEffect(() => {
    // The state updates happen after `api.me()` resolves, never synchronously
    // in the effect body — the splash is what keeps that first paint honest.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUser().catch(() => {
      // Already recorded in sessionCheckError; the splash renders the retry.
    })
  }, [refreshUser])

  // Any 401 from any endpoint signs the user out in one place, so a server
  // session that expired mid-session behaves like a deliberate logout.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('unauthenticated')
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(
    async (input: LoginInput): Promise<User> => {
      const current = await api.login(input)
      setUser(current)
      setStatus('authenticated')
      return current
    },
    [api],
  )

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      const current = await api.register(input)
      setUser(current)
      setStatus('authenticated')
      return current
    },
    [api],
  )

  const logout = useCallback(async (): Promise<void> => {
    // The endpoint is idempotent, so there is no failure path to handle here.
    await api.logout()
    setUser(null)
    setStatus('unauthenticated')
  }, [api])

  const value = useMemo(
    () => ({ status, user, sessionCheckError, login, register, logout, refreshUser }),
    [status, user, sessionCheckError, login, register, logout, refreshUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}