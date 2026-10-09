import { beforeAll, describe, expect, it } from "vitest";
import { dateOnly, daysFromToday, registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

describe("Projects API — Phase 08", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await registerUser("proj");
  });

  it("creates a project with only a name", async () => {
    const res = await user.agent.post("/api/projects").send({ name: "Solo Project" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: "Solo Project",
      description: null,
      startDate: null,
      targetDate: null,
      taskCount: 0,
      completedTaskCount: 0,
    });
    expect(typeof res.body.data.id).toBe("string");
    expect(res.body.data.userId).toBeUndefined();
  });

  it("creates with description and dates", async () => {
    const res = await user.agent.post("/api/projects").send({
      name: "Dated Project",
      description: "With dates",
      startDate: dateOnly(daysFromToday(-3)),
      targetDate: dateOnly(daysFromToday(30)),
    });

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe("With dates");
    expect(res.body.data.startDate).toBe(dateOnly(daysFromToday(-3)) + "T00:00:00.000Z");
  });

  it("rejects a missing name with 400", async () => {
    const res = await user.agent.post("/api/projects").send({ description: "nameless" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects targetDate earlier than startDate, naming the field", async () => {
    const res = await user.agent.post("/api/projects").send({
      name: "Backwards",
      startDate: dateOnly(daysFromToday(10)),
      targetDate: dateOnly(daysFromToday(1)),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const detail = res.body.error.details?.find(
      (d: { field: string }) => d.field === "targetDate",
    );
    expect(detail).toBeDefined();
    expect(detail.message).toContain("Target date must not be earlier");
  });

  it("enforces the date rule on PATCH against the stored row", async () => {
    const created = await user.agent.post("/api/projects").send({
      name: "Rule Merge",
      startDate: dateOnly(daysFromToday(5)),
    });
    expect(created.status).toBe(201);

    // Only targetDate is in the body; the service must compare it with the
    // stored startDate — the schema alone cannot see the pair.
    const res = await user.agent
      .patch(`/api/projects/${created.body.data.id as string}`)
      .send({ targetDate: dateOnly(daysFromToday(1)) });

    expect(res.status).toBe(400);
    expect(res.body.error.details?.[0]?.field).toBe("targetDate");
  });

  it("lists only the caller's projects with task counts from one groupBy", async () => {
    const other = await registerUser("proj-other");
    const otherRes = await other.agent
      .post("/api/projects")
      .send({ name: "Other person's project" });
    expect(otherRes.status).toBe(201);

    const created = await user.agent
      .post("/api/projects")
      .send({ name: "Counted Project" });
    const projectId = created.body.data.id as string;

    const statuses = ["DONE", "DONE", "TODO"] as const;
    for (const [index, status] of statuses.entries()) {
      const task = await user.agent
        .post("/api/tasks")
        .send({ title: `counted task ${index + 1}`, status, projectId });
      expect(task.status).toBe(201);
    }

    const res = await user.agent.get("/api/projects");

    expect(res.status).toBe(200);
    const mine = res.body.data.find((p: { id: string }) => p.id === projectId);
    expect(mine).toBeDefined();
    expect(mine.taskCount).toBe(3);
    expect(mine.completedTaskCount).toBe(2);
    expect(
      res.body.data.some((p: { name: string }) => p.name === "Other person's project"),
    ).toBe(false);
  });

  it("reads one project and returns 404 for another user's", async () => {
    const created = await user.agent.post("/api/projects").send({ name: "Readable" });
    const id = created.body.data.id as string;

    const own = await user.agent.get(`/api/projects/${id}`);
    expect(own.status).toBe(200);
    expect(own.body.data.id).toBe(id);

    const other = await registerUser("proj-reader");
    const theirs = await other.agent.post("/api/projects").send({ name: "Theirs" });
    const foreign = await user.agent.get(`/api/projects/${theirs.body.data.id as string}`);
    expect(foreign.status).toBe(404);
  });

  it("updates own project; empty patch is a no-op", async () => {
    const created = await user.agent.post("/api/projects").send({ name: "Original" });
    const id = created.body.data.id as string;

    const patched = await user.agent
      .patch(`/api/projects/${id}`)
      .send({ name: "Renamed", description: "now described" });
    expect(patched.status).toBe(200);
    expect(patched.body.data.name).toBe("Renamed");
    expect(patched.body.data.description).toBe("now described");

    const noop = await user.agent.patch(`/api/projects/${id}`).send({});
    expect(noop.status).toBe(200);
    expect(noop.body.data.name).toBe("Renamed");
  });

  it("updating another user's project returns 404", async () => {
    const other = await registerUser("proj-victim");
    const theirs = await other.agent.post("/api/projects").send({ name: "Untouchable" });

    const res = await user.agent
      .patch(`/api/projects/${theirs.body.data.id as string}`)
      .send({ name: "Hijacked" });

    expect(res.status).toBe(404);
    const stillTheirs = await other.agent.get(
      `/api/projects/${theirs.body.data.id as string}`,
    );
    expect(stillTheirs.body.data.name).toBe("Untouchable");
  });

  it("deleting own project cascades to its tasks", async () => {
    const created = await user.agent.post("/api/projects").send({ name: "Doomed" });
    const projectId = created.body.data.id as string;
    const task = await user.agent
      .post("/api/tasks")
      .send({ title: "doomed task", projectId });
    const taskId = task.body.data.id as string;

    const res = await user.agent.delete(`/api/projects/${projectId}`);
    expect(res.status).toBe(204);

    const gone = await user.agent.get(`/api/tasks/${taskId}`);
    expect(gone.status).toBe(404);
  });

  it("deleting another user's project returns 404 and removes nothing", async () => {
    const other = await registerUser("proj-keep");
    const theirs = await other.agent.post("/api/projects").send({ name: "Kept" });
    const projectId = theirs.body.data.id as string;
    const task = await other.agent
      .post("/api/tasks")
      .send({ title: "survivor", projectId });
    const taskId = task.body.data.id as string;

    const res = await user.agent.delete(`/api/projects/${projectId}`);
    expect(res.status).toBe(404);

    const survivor = await other.agent.get(`/api/tasks/${taskId}`);
    expect(survivor.status).toBe(200);
  });
});
