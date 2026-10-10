/**
 * Date-only utilities — parse/format `YYYY-MM-DD` as *local* dates,
 * never as UTC instants. This avoids the classic off-by-one-day bug
 * where `new Date('2026-10-15')` parses as UTC midnight and renders
 * as the 14th in timezones west of Greenwich.
 *
 * Task/Project dates arrive on the wire as full ISO datetimes
 * (`2026-10-23T00:00:00.000Z`, midnight UTC of the calendar date).
 * Reduce them with {@link toDateInputValue} / `slice(0, 10)` before
 * feeding native date inputs or these helpers.
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

/**
 * Reduce a wire datetime (`2026-10-23T00:00:00.000Z`) or date-only string to
 * `YYYY-MM-DD` for native `<input type="date">` defaults. Anything else —
 * including null/undefined — passes through unchanged so form schemas keep
 * working with optional/nullable fields.
 */
export function toDateInputValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value
}

/**
 * Reduce a wire datetime to `YYYY-MM-DDTHH:mm` for native
 * `<input type="datetime-local">` defaults, expressed in the browser's local
 * timezone. Date-only values default to midnight. Anything else passes
 * through unchanged.
 */
export function toDateTimeInputValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}