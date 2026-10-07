import type { ApiErrorCode, ApiErrorDetail } from './types'

/**
 * Thrown for every non-2xx response and every network failure. Callers branch
 * on `code`, never on message text — messages get reworded, codes do not.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details: ApiErrorDetail[]

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details: ApiErrorDetail[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  /** First message recorded against a field, for per-field display. */
  fieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/**
 * Registered once by AuthContext. Kept as a callback rather than an import so
 * this module stays free of React.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

const API_URL = import.meta.env.VITE_API_URL ?? ''

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /**
   * A 401 here is a normal state, not an expiry — `/auth/me` uses it so the
   * initial session check does not trip the global sign-out.
   */
  expectUnauthenticated?: boolean
}

interface ErrorEnvelope {
  error?: {
    code?: ApiErrorCode
    message?: string
    details?: ApiErrorDetail[]
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return typeof value === 'object' && value !== null && 'error' in value
}

/** Status code to code, for responses that arrive without a usable envelope. */
const FALLBACK_CODES: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  428: 'GITHUB_NOT_LINKED',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal, expectUnauthenticated } = options

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method,
      // The session lives in an HttpOnly cookie. Without this the browser
      // withholds it cross-origin and every request looks unauthenticated.
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError(
      'INTERNAL_ERROR',
      'Could not reach the server. Check your connection and try again.',
      0,
    )
  }

  if (!response.ok) {
    const payload = await readJson(response)
    const code =
      (isErrorEnvelope(payload) ? payload.error?.code : undefined) ??
      FALLBACK_CODES[response.status] ??
      'INTERNAL_ERROR'
    const message =
      (isErrorEnvelope(payload) ? payload.error?.message : undefined) ??
      response.statusText ??
      'Request failed.'
    const details = isErrorEnvelope(payload) ? (payload.error?.details ?? []) : []

    if (response.status === 401 && !expectUnauthenticated) {
      unauthorizedHandler?.()
    }

    throw new ApiError(code, message, response.status, details)
  }

  // 204 carries no body; `logout` relies on that.
  if (response.status === 204) {
    return undefined as T
  }

  const payload = await readJson(response)
  // The envelope is unwrapped here; the caller's generic states the expected
  // shape, which the server is responsible for honouring.
  return unwrapData(payload) as T
}

function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => undefined)
}

/** Success responses are `{ data: … }` (api-data-format §4.1). */
function unwrapData(payload: unknown): unknown {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as { data: unknown }).data
  }
  return payload
}