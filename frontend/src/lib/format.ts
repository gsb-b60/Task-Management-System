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

/**
 * `YYYY-MM-DD` → `15 Oct`, read as a local date rather than a UTC instant.
 * The Task resource carries full ISO datetimes (`2026-10-23T00:00:00.000Z`);
 * those reduce to their calendar-date part first. Anything else passes
 * through untouched so a backend change stays visible instead of blank.
 */
export function formatDateOnly(dateOnly: string | null | undefined): string {
  if (!dateOnly) return '—'
  const datePart = /^\d{4}-\d{2}-\d{2}/.test(dateOnly) ? dateOnly.slice(0, 10) : dateOnly
  const [year, month, day] = datePart.split('-').map(Number)
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