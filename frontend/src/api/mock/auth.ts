import { ApiError } from '../client'
import type { AuthApi, LoginInput, RegisterInput } from '../auth'
import type { User } from '../types'
import {
  DEMO_EMAIL,
  addDays,
  findUserByEmail,
  findUserById,
  getDb,
  nextId,
  startOfToday,
} from './db'
import { delay, resolveScenario } from './overrides'

/**
 * Mock auth with the semantics of Phase 01 rather than convenient stubs: the
 * validation and conflict shapes come from docs/api-data-format.md §6.2, and
 * a failed login is byte-identical whether the account exists or not.
 */

const SESSION_STORAGE_KEY = 'task-stream.mock.session'
const LOGIN_ATTEMPT_LIMIT = 10

const DEMO_USER_ID = '0f9c8a3e-2b71-4d55-9c18-7a4e0b3d6f12'

/** Simulated bcrypt round trip. Equal on both failure paths, on purpose. */
const HASH_DELAY_MS = 120

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token === null) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    } else {
      window.localStorage.setItem(SESSION_STORAGE_KEY, token)
    }
  } catch {
    // Private browsing or a blocked storage partition — the in-memory session
    // still works, it just will not survive a refresh.
  }
}

/**
 * The real API sets an HttpOnly cookie that JavaScript cannot read. The mock
 * mirrors that token in localStorage purely so a browser refresh keeps the
 * session, which is the only behaviour a cookie gives us that memory cannot.
 */
function currentToken(): string | null {
  const { sessions } = getDb()
  const stored = readStoredToken()
  if (stored && sessions.has(stored)) return stored
  for (const [token, userId] of sessions) {
    if (userId === DEMO_USER_ID) return token
  }
  return null
}

function toPublicUser(user: {
  id: string
  email: string
  displayName?: string
  createdAt: string
}): User {
  return { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt }
}

function invalid(details: { field: string | null; message: string }[]): ApiError {
  return new ApiError('VALIDATION_ERROR', 'Request failed validation.', 400, details)
}

/** Always costs the same, whether or not the account exists. */
async function dummyCompare(): Promise<void> {
  await delay(HASH_DELAY_MS)
}

function ensureScenarioAllowsData(): void {
  if (resolveScenario() === 'error') {
    throw new ApiError('INTERNAL_ERROR', 'Something went wrong on our end.', 500)
  }
}

export const mockAuthApi: AuthApi = {
  async register(input: RegisterInput): Promise<User> {
    await delay()
    ensureScenarioAllowsData()

    const details: { field: string; message: string }[] = []
    if (input.displayName !== undefined && input.displayName.length < 2) {
      details.push({ field: 'displayName', message: 'Must be at least 2 characters.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      details.push({ field: 'email', message: 'Must be a valid email address.' })
    }
    if (input.password.length < 8) {
      details.push({ field: 'password', message: 'Must be at least 8 characters.' })
    }
    if (details.length > 0) throw invalid(details)

    if (findUserByEmail(input.email)) {
      // Acceptable to name the field: the caller supplied the email.
      throw new ApiError('CONFLICT', 'Email is already in use.', 409, [
        { field: 'email', message: 'Email is already in use.' },
      ])
    }

    const user = {
      id: nextId(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      password: input.password,
      createdAt: addDays(startOfToday(), 0).toISOString(),
      githubConnected: false,
    }
    getDb().users.push(user)

    const token = nextId()
    getDb().sessions.set(token, user.id)
    writeStoredToken(token)

    return toPublicUser(user)
  },

  async login(input: LoginInput): Promise<User> {
    await delay()
    ensureScenarioAllowsData()

    const db = getDb()

    if (db.loginAttempts >= LOGIN_ATTEMPT_LIMIT) {
      throw new ApiError('RATE_LIMITED', 'Too many attempts.', 429, [
        {
          field: null,
          message: `Attempt ${db.loginAttempts + 1} of ${LOGIN_ATTEMPT_LIMIT} before the account is locked.`,
        },
      ])
    }

    db.loginAttempts += 1

    const details: { field: string; message: string }[] = []
    if (!input.email) details.push({ field: 'email', message: 'Must not be empty.' })
    if (!input.password) details.push({ field: 'password', message: 'Must not be empty.' })
    if (details.length > 0) throw invalid(details)

    const user = findUserByEmail(input.email)
    // The compare runs on the miss path too, so timing does not reveal
    // whether the account exists (Phase 01).
    const passwordMatches = user?.password === input.password
    await dummyCompare()

    if (!user || !passwordMatches) {
      // Byte-identical for "no such account" and "wrong password".
      throw new ApiError('UNAUTHENTICATED', 'Invalid email or password.', 401, [])
    }

    db.loginAttempts = 0

    const token = nextId()
    db.sessions.set(token, user.id)
    writeStoredToken(token)

    return toPublicUser(user)
  },

  async logout(): Promise<void> {
    await delay()
    const token = currentToken()
    if (token) getDb().sessions.delete(token)
    writeStoredToken(null)
    // Idempotent: no session, or an already-invalid token, still succeeds.
  },

  async me(): Promise<User> {
    await delay()
    if (resolveScenario() === 'error') {
      throw new ApiError('INTERNAL_ERROR', 'Something went wrong on our end.', 500)
    }

    const token = currentToken()
    if (!token) {
      // No session is a normal state, not an error to surface.
      throw new ApiError('UNAUTHENTICATED', 'Not signed in.', 401, [])
    }

    const user = findUserById(getDb().sessions.get(token) ?? '')
    if (!user) {
      writeStoredToken(null)
      throw new ApiError('UNAUTHENTICATED', 'Session expired.', 401, [])
    }

    // `createdAt` is omitted here — the session screen has no use for it.
    return { id: user.id, email: user.email, displayName: user.displayName }
  },

  githubAuthorizeUrl() {
    return resolveScenario() === 'error'
      ? '/auth/github/callback?error=access_denied'
      : '/auth/github/callback?code=mock-code'
  },
}

/** Test hook — sign a user in without going through the form. */
export function seedSession(email = DEMO_EMAIL): void {
  const user = findUserByEmail(email)
  if (!user) throw new Error(`No mock user for ${email}`)
  const token = nextId()
  getDb().sessions.set(token, user.id)
  writeStoredToken(token)
}

export function clearSession(): void {
  getDb().sessions.clear()
  writeStoredToken(null)
}