import { beforeAll, describe, expect, it } from "vitest";
import { dateOnly, daysFromToday, registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

describe("Dashboard — Phase 04 summary and upcoming", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser("dash");
    const tasks = [
      { title: "overdue", status: "TODO", priority: "HIGH", dueDate: daysFromToday(-2) },
      { title: "due today", status: "TODO", priority: "MEDIUM", dueDate: daysFromToday(0) },
      { title: "future", status: "IN_PROGRESS", priority: "LOW", dueDate: daysFromToday(5) },
      { title: "finished long ago", status: "DONE", priority: "LOW", dueDate: daysFromToday(-7) },
      { title: "no deadline", status: "TODO", priority: "MEDIUM" },
    ];
    for (const task of tasks) {
      const body: Record<string, unknown> = { ...task };
      const due = body["dueDate"];
      if (due instanceof Date) body["dueDate"] = dateOnly(due);
      const res = await user.agent.post("/api/tasks").send(body);
      if (res.status !== 201) throw new Error(`seed failed: ${res.text}`);
    }
  });

  it("GET /api/dashboard/summary returns counts with no meta block", async () => {
    const res = await user.agent.get("/api/dashboard/summary");

    expect(res.status).toBe(200);
    expect(res.body.meta).toBeUndefined();
    expect(res.body.data).toEqual({
      total: 5,
      byStatus: { TODO: 3, IN_PROGRESS: 1, DONE: 1 },
      overdue: 1,
      dueToday: 1,
    });
  });

  it("404s for a projectId that does not exist", async () => {
    const res = await user.agent.get(
      "/api/dashboard/summary?projectId=00000000-0000-4000-8000-000000000000",
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("401s without a session", async () => {
    await user.agent.post("/api/auth/logout");
    const res = await user.agent.get("/api/dashboard/summary");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/dashboard/upcoming", () => {
  it("lists due-dated, unfinished tasks oldest-first with summary fields", async () => {
    const user = await registerUser("upcoming");
    const seeds = [
      { title: "later", dueDate: daysFromToday(5) },
      { title: "overdue", dueDate: daysFromToday(-2) },
      { title: "today", dueDate: daysFromToday(0) },
      { title: "finished", status: "DONE", dueDate: daysFromToday(1) },
      { title: "undated" },
    ];
    for (const seed of seeds) {
      const body: Record<string, unknown> = { ...seed };
      const due = body["dueDate"];
      if (due instanceof Date) body["dueDate"] = dateOnly(due);
      await user.agent.post("/api/tasks").send(body);
    }

    const res = await user.agent.get("/api/dashboard/upcoming");

    expect(res.status).toBe(200);
    expect(res.body.meta.pageSize).toBe(10);
    expect(res.body.meta.totalItems).toBe(3);
    expect(res.body.data).toHaveLength(3);

    const [first, second, third] = res.body.data;
    expect(first.title).toBe("overdue");
    expect(first.isOverdue).toBe(true);
    expect(first.daysUntilDue).toBe(-2);
    expect(second.title).toBe("today");
    expect(second.daysUntilDue).toBe(0);
    expect(second.isOverdue).toBe(false);
    expect(third.title).toBe("later");
    expect(third.daysUntilDue).toBe(5);

    for (const item of res.body.data) {
      expect(item.status).not.toBe("DONE");
      expect(item.dueDate).not.toBeNull();
      expect(item.description).toBeUndefined();
      expect(item.userId).toBeUndefined();
    }
  });

  it("paginates with the Phase 04 default pageSize of 10", async () => {
    const user = await registerUser("upcoming-page");
    for (let day = 1; day <= 3; day += 1) {
      await user.agent
        .post("/api/tasks")
        .send({ title: `task ${day}`, dueDate: dateOnly(daysFromToday(day)) });
    }

    const res = await user.agent.get("/api/dashboard/upcoming?pageSize=2&page=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("is scoped to the caller", async () => {
    const owner = await registerUser("upcoming-owner");
    const stranger = await registerUser("upcoming-stranger");
    await owner.agent
      .post("/api/tasks")
      .send({ title: "mine", dueDate: dateOnly(daysFromToday(1)) });

    const res = await stranger.agent.get("/api/dashboard/upcoming");

    expect(res.status).toBe(200);
    expect(res.body.meta.totalItems).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });
});
