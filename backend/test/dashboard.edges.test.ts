// Phase 10 — dashboard branches: project scoping on both endpoints and the
// full filter spread on /upcoming (Phase 04 §5).
import { describe, expect, it } from "vitest";
import { dateOnly, daysFromToday, registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

async function createProject(user: TestUser, name: string): Promise<string> {
  const res = await user.agent.post("/api/projects").send({ name });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function seedTask(user: TestUser, body: Record<string, unknown>): Promise<void> {
  const due = body["dueDate"];
  if (due instanceof Date) body["dueDate"] = dateOnly(due);
  const res = await user.agent.post("/api/tasks").send(body);
  expect(res.status).toBe(201);
}

describe("dashboard service edges (Phase 10)", () => {
  it("scopes the summary to an owned project", async () => {
    const user = await registerUser("dash-scoped");
    const projectId = await createProject(user, "Scoped");
    await seedTask(user, { title: "inside", projectId, status: "DONE", dueDate: daysFromToday(-1) });
    await seedTask(user, { title: "outside", status: "DONE", dueDate: daysFromToday(-1) });

    const res = await user.agent.get(`/api/dashboard/summary?projectId=${projectId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 1,
      byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 1 },
      overdue: 0,
      dueToday: 0,
    });
  });

  it("404s upcoming for a project the caller does not own", async () => {
    const owner = await registerUser("dash-owner");
    const stranger = await registerUser("dash-stranger");
    const projectId = await createProject(owner, "Owner only");

    const res = await stranger.agent.get(`/api/dashboard/upcoming?projectId=${projectId}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("passes every upcoming filter through in one request", async () => {
    const user = await registerUser("dash-all-filters");
    const projectId = await createProject(user, "Filtered");
    await seedTask(user, { title: "alpha high", status: "TODO", priority: "HIGH", projectId, dueDate: daysFromToday(1) });
    await seedTask(user, { title: "beta high", status: "TODO", priority: "HIGH", projectId, dueDate: daysFromToday(2) });
    await seedTask(user, { title: "alpha low", status: "TODO", priority: "LOW", projectId, dueDate: daysFromToday(3) });
    await seedTask(user, { title: "alpha high outside", status: "TODO", priority: "HIGH", dueDate: daysFromToday(1) });

    const res = await user.agent.get(
      `/api/dashboard/upcoming?projectId=${projectId}&q=alpha&status=TODO&priority=HIGH&sortBy=dueDate&sortOrder=desc`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("alpha high");
  });
});
