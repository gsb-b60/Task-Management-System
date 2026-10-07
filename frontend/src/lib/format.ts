import { isApiError } from '../api/client'

/**
 * Due labels render straight off `daysUntilDue`, which the server computed.
 * Deriving it here from the browser clock would disagree west of Greenwich
 * and whenever the two clocks drift.
 */
export function dueLabel(daysUntilDue: number | null | undefined): string {
  if (daysUntilDue === null || daysUntilDue === undefined) return 'No due date'
  if (daysUntilDue === 0) return 'due today'
  if (daysUntilDue === 1) return 'in 1 day'
  if (daysUntilDue === -1) return 'overdue by 1 day'
  if (daysUntilDue < 0) return `overdue by ${Math.abs(daysUntilDue)} days`
  return `in ${daysUntilDue} days`
}

/** `YYYY-MM-DD` → `15 Oct`, read as a local date rather than a UTC instant. */
export function formatDateOnly(dateOnly: string | null | undefined): string {
  if (!dateOnly) return '—'
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (!year || !month || !day) return dateOnly
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

/** The human message for a failed query, never a raw stack or SQL string. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function initialsOf(name: string | null | undefined, email: string): string {
  const source = (name ?? '').trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}