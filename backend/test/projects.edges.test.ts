// Phase 08 service edges: the date-rule short-circuit on a lone start date,
// the full-field PATCH spread, and the zero-counts path for a new project.
import { describe, expect, it } from "vitest";
import { registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

async function createProject(user: TestUser, body: Record<string, unknown>) {
  const res = await user.agent.post("/api/projects").send(body);
  expect(res.status).toBe(201);
  return res.body.data as { id: string };
}

describe("projects service edges (Phase 10)", () => {
  it("accepts a start date with no target date — the order rule short-circuits", async () => {
    const user = await registerUser("proj-start-only");
    const res = await user.agent.post("/api/projects").send({
      name: "starts someday",
      startDate: "2026-11-01",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.startDate).not.toBeNull();
    expect(res.body.data.targetDate).toBeNull();
  });

  it("patches every writable field in one request", async () => {
    const user = await registerUser("proj-full-patch");
    const project = await createProject(user, { name: "before" });

    const res = await user.agent.patch(`/api/projects/${project.id}`).send({
      name: "after",
      description: "with a description",
      startDate: "2026-11-01",
      targetDate: "2026-11-30",
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: "after",
      description: "with a description",
    });
    expect(res.body.data.startDate).toBe("2026-11-01T00:00:00.000Z");
    expect(res.body.data.targetDate).toBe("2026-11-30T00:00:00.000Z");
  });

  it("lists a brand-new project with zero task counts", async () => {
    const user = await registerUser("proj-empty-list");
    await createProject(user, { name: "Empty counts" });

    const res = await user.agent.get("/api/projects");

    expect(res.status).toBe(200);
    const empty = res.body.data.find(
      (project: { name: string }) => project.name === "Empty counts",
    );
    expect(empty).toMatchObject({ taskCount: 0, completedTaskCount: 0 });
  });
});
