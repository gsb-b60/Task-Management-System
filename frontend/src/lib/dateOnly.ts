/**
 * Date-only utilities — parse/format `YYYY-MM-DD` as *local* dates,
 * never as UTC instants. This avoids the classic off-by-one-day bug
 * where `new Date('2026-10-15')` parses as UTC midnight and renders
 * as the 14th in timezones west of Greenwich.
 *
 * The server stores date-only fields as UTC midnight (`2026-10-15T00:00:00.000Z`)
 * but the wire format is `YYYY-MM-DD`. We read/write that string directly.
 */

/** Parse `YYYY-MM-DD` into a local `Date` at midnight. */
export function parseDateOnly(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Format a `Date` as `YYYY-MM-DD` in the local timezone. */
export function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parse `YYYY-MM-DD` → `Date` → format for display (e.g. "15 Oct"). */
export function formatDateOnlyForDisplay(dateOnly: string): string {
  const date = parseDateOnly(dateOnly)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Add `days` to a date-only string, return new `YYYY-MM-DD`. */
export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const date = parseDateOnly(dateOnly)
  date.setDate(date.getDate() + days)
  return formatDateOnly(date)
}

/** Difference in calendar days between two date-only strings. */
export function daysBetween(dateOnlyA: string, dateOnlyB: string): number {
  const a = parseDateOnly(dateOnlyA)
  const b = parseDateOnly(dateOnlyB)
  const msPerDay = 86_400_000
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

/** Clamp a percentage to [0, 1]. */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}