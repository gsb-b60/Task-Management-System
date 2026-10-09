import { beforeAll, describe, expect, it } from "vitest";
import { registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

describe("Task CRUD — POST /api/tasks", () => {
  it("creates a task with contract defaults and returns 201", async () => {
    const user = await registerUser("task-create");
    const res = await user.agent.post("/api/tasks").send({ title: "First task" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "First task",
      description: null,
      status: "TODO",
      priority: "MEDIUM",
      startDate: null,
      dueDate: null,
      projectId: null,
      githubIssueNumber: null,
      githubState: null,
    });
    expect(res.body.data.id).toEqual(expect.any(String));
    expect(res.body.data.userId).toBeUndefined();
    expect(res.body.data.createdAt).toEqual(expect.any(String));
  });

  it("rejects an empty or whitespace title with a field-level 400", async () => {
    const user = await registerUser("task-empty-title");
    const res = await user.agent.post("/api/tasks").send({ title: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "title" }),
    ]);
  });

  it("rejects a title over 200 characters", async () => {
    const user = await registerUser("task-long-title");
    const res = await user.agent
      .post("/api/tasks")
      .send({ title: "x".repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body.error.details?.[0]?.field).toBe("title");
  });

  it("rejects dueDate earlier than startDate on create", async () => {
    const user = await registerUser("task-date-order");
    const res = await user.agent.post("/api/tasks").send({
      title: "Bad dates",
      startDate: "2026-01-10",
      dueDate: "2026-01-05",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      {
        field: "dueDate",
        message: "Due date must not be earlier than start date.",
      },
    ]);
  });

  it("rejects unrecognised keys (id, userId) with a 400", async () => {
    const user = await registerUser("task-strict");
    const res = await user.agent.post("/api/tasks").send({ title: "x", userId: "nope" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unrecognised enum values", async () => {
    const user = await registerUser("task-bad-enum");
    const res = await user.agent
      .post("/api/tasks")
      .send({ title: "x", status: "MAYBE" });

    expect(res.status).toBe(400);
    expect(res.body.error.details?.[0]?.field).toBe("status");
  });

  it("accepts every valid status and priority value", async () => {
    const user = await registerUser("task-enum-ok");
    const statuses = ["TODO", "IN_PROGRESS", "DONE"];
    const priorities = ["LOW", "MEDIUM", "HIGH"];

    for (const status of statuses) {
      const res = await user.agent.post("/api/tasks").send({ title: `S ${status}`, status });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(status);
    }
    for (const priority of priorities) {
      const res = await user.agent.post("/api/tasks").send({ title: `P ${priority}`, priority });
      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe(priority);
    }
  });
});

describe("Task CRUD — GET /api/tasks/:id", () => {
  it("returns the task for its owner", async () => {
    const user = await registerUser("task-get");
    const created = await user.agent.post("/api/tasks").send({ title: "Fetch me" });
    const res = await user.agent.get(`/api/tasks/${created.body.data.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Fetch me");
  });

  it("404s for an unknown id and for another user's task", async () => {
    const owner = await registerUser("task-owner");
    const stranger = await registerUser("task-stranger");
    const created = await owner.agent.post("/api/tasks").send({ title: "Private" });

    const unknown = await owner.agent.get("/api/tasks/00000000-0000-4000-8000-000000000000");
    const foreign = await stranger.agent.get(`/api/tasks/${created.body.data.id}`);

    expect(unknown.status).toBe(404);
    expect(foreign.status).toBe(404);
    expect(unknown.body.error.code).toBe("NOT_FOUND");
    expect(foreign.body.error.code).toBe("NOT_FOUND");
  });

  it("401s without a session", async () => {
    const res = await registerUserThenLogout();
    expect(res).toBe(401);
  });
});

async function registerUserThenLogout(): Promise<number> {
  const user = await registerUser("task-unauth");
  await user.agent.post("/api/auth/logout");
  const res = await user.agent.get("/api/tasks/00000000-0000-4000-8000-000000000000");
  return res.status;
}

describe("Task CRUD — PATCH /api/tasks/:id", () => {
  let user: TestUser;
  let taskId: string;

  beforeAll(async () => {
    user = await registerUser("task-patch");
    const created = await user.agent.post("/api/tasks").send({
      title: "Patch target",
      description: "keep me",
      startDate: "2026-01-10",
      dueDate: "2026-01-20",
      priority: "HIGH",
    });
    taskId = created.body.data.id as string;
  });

  it("applies a partial update and preserves omitted fields byte-for-byte", async () => {
    const res = await user.agent.patch(`/api/tasks/${taskId}`).send({ status: "IN_PROGRESS" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("IN_PROGRESS");
    expect(res.body.data.description).toBe("keep me");
    expect(res.body.data.startDate).toBe("2026-01-10T00:00:00.000Z");
    expect(res.body.data.dueDate).toBe("2026-01-20T00:00:00.000Z");
    expect(res.body.data.priority).toBe("HIGH");
    expect(res.body.data.title).toBe("Patch target");
  });

  it("clears a nullable field with an explicit null", async () => {
    const res = await user.agent.patch(`/api/tasks/${taskId}`).send({ description: null });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBeNull();
    expect(res.body.data.status).toBe("IN_PROGRESS");
  });

  it("treats an empty body as a no-op that returns the task", async () => {
    const before = await user.agent.get(`/api/tasks/${taskId}`);
    const res = await user.agent.patch(`/api/tasks/${taskId}`).send({});

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(before.body.data);
  });

  it("rejects dueDate earlier than the stored startDate", async () => {
    const res = await user.agent.patch(`/api/tasks/${taskId}`).send({ dueDate: "2026-01-05" });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      {
        field: "dueDate",
        message: "Due date must not be earlier than start date.",
      },
    ]);
  });

  it("rejects immutable fields with a 400", async () => {
    const res = await user.agent.patch(`/api/tasks/${taskId}`).send({ id: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("404s when patching another user's task", async () => {
    const stranger = await registerUser("task-patch-stranger");
    const res = await stranger.agent.patch(`/api/tasks/${taskId}`).send({ status: "DONE" });
    expect(res.status).toBe(404);
  });
});

describe("Task CRUD — DELETE /api/tasks/:id", () => {
  it("deletes the task: 204, then 404 on read", async () => {
    const user = await registerUser("task-delete");
    const created = await user.agent.post("/api/tasks").send({ title: "Delete me" });
    const id = created.body.data.id as string;

    const deleted = await user.agent.delete(`/api/tasks/${id}`);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");

    const after = await user.agent.get(`/api/tasks/${id}`);
    expect(after.status).toBe(404);
  });

  it("404s when deleting another user's task", async () => {
    const owner = await registerUser("task-del-owner");
    const stranger = await registerUser("task-del-stranger");
    const created = await owner.agent.post("/api/tasks").send({ title: "Mine" });

    const res = await stranger.agent.delete(`/api/tasks/${created.body.data.id}`);
    expect(res.status).toBe(404);

    const stillThere = await owner.agent.get(`/api/tasks/${created.body.data.id}`);
    expect(stillThere.status).toBe(200);
  });
});
