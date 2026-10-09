import { describe, expect, it } from "vitest";
import { InvalidDateError, isDateOnly, parseApiDate } from "../../src/lib/dates.js";
import {
  daysUntilDue,
  isDueToday,
  isOverdue,
  localDayWindow,
  startOfLocalDay,
} from "../../src/service/dueDate.js";

describe("parseApiDate", () => {
  it("parses date-only input as UTC midnight", () => {
    const parsed = parseApiDate("2026-03-05");
    expect(parsed.getTime()).toBe(Date.UTC(2026, 2, 5));
    expect(parsed.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("passes full ISO-8601 instants through unchanged", () => {
    const parsed = parseApiDate("2026-03-05T12:34:56.000Z");
    expect(parsed.toISOString()).toBe("2026-03-05T12:34:56.000Z");
  });

  it("rejects impossible calendar dates", () => {
    expect(() => parseApiDate("2026-13-40")).toThrow(InvalidDateError);
    expect(() => parseApiDate("2026-02-30")).toThrow(InvalidDateError);
  });

  it("rejects unparseable strings", () => {
    expect(() => parseApiDate("not-a-date")).toThrow(InvalidDateError);
    expect(() => parseApiDate("")).toThrow(InvalidDateError);
  });
});

describe("isDateOnly", () => {
  it("distinguishes bare dates from instants", () => {
    expect(isDateOnly("2026-03-05")).toBe(true);
    expect(isDateOnly("2026-03-05T00:00:00Z")).toBe(false);
    expect(isDateOnly("5/3/2026")).toBe(false);
  });
});

describe("due-date calendar-day arithmetic", () => {
  const now = new Date(2026, 9, 9, 15, 30);

  it("startOfLocalDay returns local midnight of the same calendar day", () => {
    const start = startOfLocalDay(now);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(9);
    expect(start.getDate()).toBe(9);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it("daysUntilDue counts calendar days, not 24-hour spans", () => {
    expect(daysUntilDue(new Date(2026, 9, 5), now)).toBe(-4);
    expect(daysUntilDue(new Date(2026, 9, 9, 23, 59), now)).toBe(0);
    expect(daysUntilDue(new Date(2026, 9, 12), now)).toBe(3);
  });

  it("a DONE task is never overdue", () => {
    expect(isOverdue(new Date(2026, 9, 1), "DONE", now)).toBe(false);
    expect(isOverdue(new Date(2026, 9, 1), "TODO", now)).toBe(true);
    expect(isOverdue(new Date(2026, 9, 20), "IN_PROGRESS", now)).toBe(false);
  });

  it("isDueToday is true for any time on the same local calendar day", () => {
    expect(isDueToday(new Date(2026, 9, 9, 23, 0), now)).toBe(true);
    expect(isDueToday(new Date(2026, 9, 9, 0, 1), now)).toBe(true);
    expect(isDueToday(new Date(2026, 9, 10), now)).toBe(false);
    expect(isDueToday(new Date(2026, 9, 8, 23, 0), now)).toBe(false);
  });

  it("localDayWindow is half-open: start inclusive, end exclusive", () => {
    const { start, end } = localDayWindow(now);
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(now.getTime()).toBeLessThan(end.getTime());
    expect(end.getTime() - start.getTime()).toBe(86_400_000);
    expect(end.getTime()).not.toBeLessThanOrEqual(start.getTime());
  });
});
