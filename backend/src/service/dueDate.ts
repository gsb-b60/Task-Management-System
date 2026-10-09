// Calendar-day arithmetic for due dates.
//
// "Due today" means the same local calendar date — not "within 24 hours" — so
// a task due at 23:00 tonight is `daysUntilDue: 0`, not `1` (Phase 04 §5.3).
// Every value here is computed server-side and returned literally; a client
// clock in another timezone must render these verbatim (api-data-format §5.3).
//
// The server's local timezone is the reference. The Roadmap (Phase 09) reuses
// these helpers so the two views never disagree about a day boundary.
import type { TaskStatus } from "../types/domain.js";

const MS_PER_DAY = 86_400_000;

/** Midnight of the calendar day `date` falls on, in server-local time. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Negative when overdue, `0` when due today, positive when upcoming. */
export function daysUntilDue(dueDate: Date, now: Date): number {
  const today = startOfLocalDay(now).getTime();
  const due = startOfLocalDay(dueDate).getTime();
  // `round`, not `floor`: a DST-shortened day is 23h and would otherwise
  // count as one day short.
  return Math.round((due - today) / MS_PER_DAY);
}

/** A completed task is never overdue, however late it was finished. */
export function isOverdue(dueDate: Date, status: TaskStatus, now: Date): boolean {
  if (status === "DONE") return false;
  return daysUntilDue(dueDate, now) < 0;
}

export function isDueToday(dueDate: Date, now: Date): boolean {
  return daysUntilDue(dueDate, now) === 0;
}

/** Half-open window `[start, end)` covering today's local calendar day. */
export function localDayWindow(now: Date): { start: Date; end: Date } {
  const start = startOfLocalDay(now);
  return { start, end: new Date(start.getTime() + MS_PER_DAY) };
}
