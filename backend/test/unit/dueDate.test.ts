import { describe, expect, it } from "vitest";
import {
  daysUntilDue,
  isDueToday,
  isOverdue,
  localDayWindow,
  startOfLocalDay,
} from "../../src/service/dueDate.js";

describe("dueDate.ts (Phase 04 unit)", () => {
  const today = new Date(2026, 5, 15, 14, 30); // local, mid-afternoon

  it("counts calendar days, not 24-hour windows", () => {
    // 11 hours away but still "today" in local calendar terms.
    const dueTonight = new Date(2026, 5, 15, 23, 45);
    expect(daysUntilDue(dueTonight, today)).toBe(0);

    const dueTomorrow = new Date(2026, 5, 16, 0, 15);
    expect(daysUntilDue(dueTomorrow, today)).toBe(1);

    const dueYesterday = new Date(2026, 5, 14, 23, 0);
    expect(daysUntilDue(dueYesterday, today)).toBe(-1);
  });

  it("isOverdue flags only unfinished tasks past their day", () => {
    const yesterday = new Date(2026, 5, 14);
    const tomorrow = new Date(2026, 5, 16);
    expect(isOverdue(yesterday, "TODO", today)).toBe(true);
    expect(isOverdue(yesterday, "IN_PROGRESS", today)).toBe(true);
    expect(isOverdue(yesterday, "DONE", today)).toBe(false);
    expect(isOverdue(tomorrow, "TODO", today)).toBe(false);
    expect(isOverdue(new Date(2026, 5, 15, 23, 59), "TODO", today)).toBe(false);
  });

  it("isDueToday is true only for the same local calendar day", () => {
    expect(isDueToday(new Date(2026, 5, 15, 0, 0), today)).toBe(true);
    expect(isDueToday(new Date(2026, 5, 15, 23, 59), today)).toBe(true);
    expect(isDueToday(new Date(2026, 5, 16, 0, 0), today)).toBe(false);
  });

  it("startOfLocalDay and localDayWindow are half-open on the local day", () => {
    const midnight = startOfLocalDay(today);
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getDate()).toBe(15);

    const window = localDayWindow(today);
    expect(window.start.getTime()).toBe(midnight.getTime());
    expect(window.end.getTime()).toBe(midnight.getTime() + 86_400_000);
    expect(today >= window.start && today < window.end).toBe(true);
    expect(new Date(2026, 5, 15, 23, 59, 59, 999) < window.end).toBe(true);
    // [start, end) — midnight next day is the exclusive boundary.
    expect(new Date(2026, 5, 16, 0, 0) >= window.end).toBe(true);
  });
});
