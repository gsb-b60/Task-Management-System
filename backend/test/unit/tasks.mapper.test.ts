import { describe, expect, it } from "vitest";
import { buildSummary, toTaskDto, toTaskSummaryDto } from "../../src/service/tasks.mapper.js";
import type { TaskRow } from "../../src/types/domain.js";

const row: TaskRow = {
  id: "task-1",
  title: "Write the report",
  description: "Quarterly numbers",
  status: "IN_PROGRESS",
  priority: "HIGH",
  startDate: new Date("2026-10-01T00:00:00.000Z"),
  // Local midnight: day arithmetic below must be timezone-independent.
  dueDate: new Date(2026, 9, 10),
  userId: "user-secret-id",
  projectId: "project-1",
  githubIssueNumber: 24,
  githubState: "open",
  createdAt: new Date("2026-10-01T09:00:00.000Z"),
  updatedAt: new Date("2026-10-02T09:00:00.000Z"),
};

describe("tasks.mapper.ts (Phase 02 unit)", () => {
  it("maps a row to the wire DTO without userId", () => {
    const dto = toTaskDto(row);
    expect(dto).not.toHaveProperty("userId");
    expect(JSON.stringify(dto)).not.toContain("user-secret-id");
    expect(dto).toEqual({
      id: "task-1",
      title: "Write the report",
      description: "Quarterly numbers",
      status: "IN_PROGRESS",
      priority: "HIGH",
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      dueDate: new Date(2026, 9, 10),
      projectId: "project-1",
      githubIssueNumber: 24,
      githubState: "open",
      createdAt: new Date("2026-10-01T09:00:00.000Z"),
      updatedAt: new Date("2026-10-02T09:00:00.000Z"),
    });
  });

  it("drops undated tasks from the dashboard summary list", () => {
    expect(toTaskSummaryDto({ ...row, dueDate: null }, new Date())).toBeNull();
  });

  it("computes overdue and daysUntilDue for dated tasks", () => {
    const now = new Date(2026, 9, 8, 10, 0);
    const summary = toTaskSummaryDto(row, now);
    expect(summary).not.toBeNull();
    expect(summary?.dueDate).toEqual(new Date(2026, 9, 10));
    expect(summary?.isOverdue).toBe(false);
    expect(summary?.daysUntilDue).toBe(2);

    const late = toTaskSummaryDto({ ...row, dueDate: new Date(2026, 9, 1) }, now);
    expect(late?.isOverdue).toBe(true);
    expect(late?.daysUntilDue).toBe(-7);

    const done = toTaskSummaryDto(
      { ...row, dueDate: new Date(2026, 9, 1), status: "DONE" },
      now,
    );
    expect(done?.isOverdue).toBe(false);
  });

  it("builds a dashboard summary where every status is present", () => {
    const summary = buildSummary(
      [
        { status: "TODO", count: 3 },
        { status: "DONE", count: 2 },
      ],
      1,
      4,
    );
    expect(summary).toEqual({
      total: 5,
      byStatus: { TODO: 3, IN_PROGRESS: 0, DONE: 2 },
      overdue: 1,
      dueToday: 4,
    });
    expect(buildSummary([], 0, 0).total).toBe(0);
  });
});
