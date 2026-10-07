import { createContext, useContext } from 'react'
import type { AuthApi, LoginInput, RegisterInput } from '../api/auth'
import type { User } from '../api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** Set when the initial session check failed for a non-401 reason. */
  sessionCheckError: Error | null
  login(input: LoginInput): Promise<User>
  register(input: RegisterInput): Promise<User>
  logout(): Promise<void>
  refreshUser(): Promise<User | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside an AuthProvider')
  return value
}

export type AuthProviderProps = {
  children: React.ReactNode
  /** Injected by tests; defaults to the implementation selected in api/index. */
  api?: AuthApi
}