// Date-only values (`2026-10-15`) are calendar days, not instants.
//
// The API contract (api-data-format §4.2) accepts a date-only string and
// interprets it as UTC midnight, and warns against `new Date("2026-10-15")`
// only because that overload is ambiguous across engines — here the string is
// assembled explicitly so the intent is fixed: midnight **UTC**, never the
// machine's local midnight.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export class InvalidDateError extends Error {
  constructor(value: string) {
    super(`Invalid date: ${value}`);
    this.name = "InvalidDateError";
  }
}

/** Parses an API date input. Returns `null` for an absent value. */
export function parseApiDate(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (match !== null) {
    const [, year, month, day] = match;
    if (year === undefined || month === undefined || day === undefined) {
      throw new InvalidDateError(value);
    }
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      parsed.getUTCFullYear() !== Number(year) ||
      parsed.getUTCMonth() !== Number(month) - 1 ||
      parsed.getUTCDate() !== Number(day)
    ) {
      throw new InvalidDateError(value);
    }
    return parsed;
  }

  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw new InvalidDateError(value);
  }
  return instant;
}

/** `true` when the value is a bare `YYYY-MM-DD` calendar date. */
export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value);
}
