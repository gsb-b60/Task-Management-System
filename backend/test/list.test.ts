import { beforeAll, describe, expect, it } from "vitest";
import { dateOnly, daysFromToday, registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

describe("GET /api/tasks — search, filter, sort, pagination", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser("list");
    const tasks = [
      { title: "needle one", status: "TODO", priority: "HIGH", dueDate: daysFromToday(2) },
      { title: "unrelated task", status: "DONE", priority: "LOW", dueDate: daysFromToday(10) },
      { title: "no deadline", status: "IN_PROGRESS", priority: "MEDIUM" },
      { title: "past due needle", status: "TODO", priority: "LOW", dueDate: daysFromToday(-3) },
    ];
    for (const task of tasks) {
      const body: Record<string, unknown> = { ...task };
      const due = body["dueDate"];
      if (due instanceof Date) body["dueDate"] = dateOnly(due);
      const res = await user.agent.post("/api/tasks").send(body);
      if (res.status !== 201) throw new Error(`seed failed: ${res.text}`);
    }
  });

  it("returns the full list with meta defaults on page 1", async () => {
    const res = await user.agent.get("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 4,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0].userId).toBeUndefined();
  });

  it("filters by comma-separated status values", async () => {
    const res = await user.agent.get("/api/tasks?status=TODO,DONE");

    expect(res.status).toBe(200);
    expect(res.body.meta.totalItems).toBe(3);
    for (const task of res.body.data) {
      expect(["TODO", "DONE"]).toContain(task.status);
    }
  });

  it("filters by repeated status params", async () => {
    const res = await user.agent.get("/api/tasks?status=TODO&status=DONE");
    expect(res.body.meta.totalItems).toBe(3);
  });

  it("filters by priority", async () => {
    const res = await user.agent.get("/api/tasks?priority=LOW");
    expect(res.body.meta.totalItems).toBe(2);
    for (const task of res.body.data) expect(task.priority).toBe("LOW");
  });

  it("searches titles case-insensitively", async () => {
    const res = await user.agent.get("/api/tasks?q=needle");
    expect(res.body.meta.totalItems).toBe(2);
    for (const task of res.body.data) {
      expect(task.title.toLowerCase()).toContain("needle");
    }
  });

  it("filters to tasks without a due date", async () => {
    const res = await user.agent.get("/api/tasks?hasDueDate=false");

    expect(res.status).toBe(200);
    expect(res.body.meta.totalItems).toBe(1);
    expect(res.body.data.map((task: { title: string }) => task.title)).toEqual([
      "no deadline",
    ]);
    for (const task of res.body.data) {
      expect(task.dueDate).toBeNull();
    }
  });

  it("filters to tasks with a due date", async () => {
    const res = await user.agent.get("/api/tasks?hasDueDate=true");

    expect(res.status).toBe(200);
    expect(res.body.meta.totalItems).toBe(3);
    for (const task of res.body.data) {
      expect(task.dueDate).not.toBeNull();
    }
  });

  it("rejects a non-boolean hasDueDate with a 400 naming the field", async () => {
    const res = await user.agent.get("/api/tasks?hasDueDate=maybe");

    expect(res.status).toBe(400);
    expect(res.body.error.details?.[0]?.field).toBe("hasDueDate");
  });

  it("paginates with correct meta", async () => {
    const res = await user.agent.get("/api/tasks?page=2&pageSize=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 4,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("clamps pageSize above 100 instead of rejecting it", async () => {
    const res = await user.agent.get("/api/tasks?pageSize=500");

    expect(res.status).toBe(200);
    expect(res.body.meta.pageSize).toBe(100);
    expect(res.body.data).toHaveLength(4);
  });

  it("rejects page=0 and page=-1 with 400", async () => {
    const zero = await user.agent.get("/api/tasks?page=0");
    const negative = await user.agent.get("/api/tasks?page=-1");

    expect(zero.status).toBe(400);
    expect(negative.status).toBe(400);
    expect(zero.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown enum value with a 400 naming the field", async () => {
    const res = await user.agent.get("/api/tasks?status=MAYBE");

    expect(res.status).toBe(400);
    expect(res.body.error.details?.[0]?.field).toBe("status.0");
  });

  it("rejects an unknown sortBy", async () => {
    const res = await user.agent.get("/api/tasks?sortBy=ghost");
    expect(res.status).toBe(400);
    expect(res.body.error.details?.[0]?.field).toBe("sortBy");
  });

  it("ignores unrecognised query params", async () => {
    const res = await user.agent.get("/api/tasks?foo=bar");
    expect(res.status).toBe(200);
    expect(res.body.meta.totalItems).toBe(4);
  });

  it("sorts by dueDate ascending with undated tasks last", async () => {
    const res = await user.agent.get("/api/tasks?sortBy=dueDate&sortOrder=asc");

    expect(res.status).toBe(200);
    const titles = res.body.data.map((task: { title: string }) => task.title);
    expect(titles).toEqual(["past due needle", "needle one", "unrelated task", "no deadline"]);
  });

  it("sorts by dueDate descending with undated tasks first", async () => {
    const res = await user.agent.get("/api/tasks?sortBy=dueDate&sortOrder=desc");

    expect(res.status).toBe(200);
    const titles = res.body.data.map((task: { title: string }) => task.title);
    expect(titles).toEqual(["no deadline", "unrelated task", "needle one", "past due needle"]);
  });
});
