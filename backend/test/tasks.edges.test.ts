// Phase 10 §5 — task service branches the happy-path suite never takes:
// date-rule short-circuits, foreign-project ownership, the PATCH merge, and
// the every-field-in-one-request spread.
import { describe, expect, it } from "vitest";
import { dateOnly, daysFromToday, registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

async function createProject(user: TestUser, name: string): Promise<string> {
  const res = await user.agent.post("/api/projects").send({ name });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function createTask(user: TestUser, body: Record<string, unknown>) {
  const res = await user.agent.post("/api/tasks").send(body);
  expect(res.status).toBe(201);
  return res.body.data as { id: string; startDate: string | null; dueDate: string | null };
}

describe("tasks service edges (Phase 10)", () => {
  it("accepts a start date with no due date — the order rule short-circuits", async () => {
    const user = await registerUser("task-start-only");
    const data = await createTask(user, {
      title: "starts someday",
      startDate: dateOnly(daysFromToday(1)),
    });

    expect(data.startDate).not.toBeNull();
    expect(data.dueDate).toBeNull();
  });

  it("accepts a due date with no start date and an explicit null description", async () => {
    const user = await registerUser("task-due-only");
    const data = await createTask(user, {
      title: "due only",
      description: null,
      dueDate: dateOnly(daysFromToday(2)),
    });

    expect(data.startDate).toBeNull();
    expect(data.dueDate).not.toBeNull();
  });

  it("404s when creating or listing against someone else's project", async () => {
    const owner = await registerUser("task-owner");
    const stranger = await registerUser("task-stranger");
    const projectId = await createProject(owner, "Private to owner");

    const created = await stranger.agent.post("/api/tasks").send({ title: "intruder", projectId });
    expect(created.status).toBe(404);
    expect(created.body.error.code).toBe("NOT_FOUND");

    const listed = await stranger.agent.get(`/api/tasks?projectId=${projectId}`);
    expect(listed.status).toBe(404);
    expect(listed.body.error.code).toBe("NOT_FOUND");
  });

  it("applies every list filter at once against an owned project", async () => {
    const user = await registerUser("task-all-filters");
    const projectId = await createProject(user, "Filtered");
    await createTask(user, { title: "match me", status: "DONE", priority: "HIGH", projectId });
    await createTask(user, { title: "other task", status: "TODO", priority: "LOW" });

    const res = await user.agent.get(
      `/api/tasks?q=match&status=DONE&priority=HIGH&projectId=${projectId}&sortBy=dueDate&sortOrder=desc`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("match me");
  });

  it("patches every writable field in one request and moves between own projects", async () => {
    const user = await registerUser("task-full-patch");
    const first = await createProject(user, "First home");
    const second = await createProject(user, "Second home");
    const task = await createTask(user, { title: "before", projectId: first });

    const res = await user.agent.patch(`/api/tasks/${task.id}`).send({
      title: "after",
      description: null,
      status: "DONE",
      priority: "LOW",
      startDate: dateOnly(daysFromToday(1)),
      dueDate: dateOnly(daysFromToday(4)),
      projectId: second,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: "after",
      description: null,
      status: "DONE",
      priority: "LOW",
      projectId: second,
    });
    expect(res.body.data.startDate).not.toBeNull();
    expect(res.body.data.dueDate).not.toBeNull();
  });

  it("merges a dueDate-only patch with the stored startDate", async () => {
    const user = await registerUser("task-merge");
    const task = await createTask(user, {
      title: "merge target",
      startDate: dateOnly(daysFromToday(1)),
      dueDate: dateOnly(daysFromToday(3)),
    });

    const patched = await user.agent
      .patch(`/api/tasks/${task.id}`)
      .send({ dueDate: dateOnly(daysFromToday(6)) });
    expect(patched.status).toBe(200);
    expect(patched.body.data.startDate).toBe(task.startDate);
    expect(patched.body.data.dueDate).not.toBe(task.dueDate);

    const titleOnly = await user.agent.patch(`/api/tasks/${task.id}`).send({ title: "renamed" });
    expect(titleOnly.status).toBe(200);
    expect(titleOnly.body.data.startDate).toBe(task.startDate);
    expect(titleOnly.body.data.dueDate).toBe(patched.body.data.dueDate);
  });

  it("404s when a patch targets someone else's project", async () => {
    const owner = await registerUser("patch-owner");
    const stranger = await registerUser("patch-stranger");
    const foreignProject = await createProject(owner, "Owner's project");
    const task = await createTask(stranger, { title: "stranger's task" });

    const res = await stranger.agent.patch(`/api/tasks/${task.id}`).send({ projectId: foreignProject });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("clears the project with an explicit null projectId", async () => {
    const user = await registerUser("patch-null-project");
    const projectId = await createProject(user, "Detachable");
    const task = await createTask(user, { title: "attached", projectId });

    const res = await user.agent.patch(`/api/tasks/${task.id}`).send({ projectId: null });

    expect(res.status).toBe(200);
    expect(res.body.data.projectId).toBeNull();
  });
});
