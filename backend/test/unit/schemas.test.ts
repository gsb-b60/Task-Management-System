// Schema-level edge cases (Phase 10 §5.1: validation is core logic).
// These run the exact Zod schemas the controllers parse, without HTTP.
import { describe, expect, it } from "vitest";
import {
  createTaskBody,
  taskListQuery,
  updateTaskBody,
} from "../../src/presentation/tasks/tasks.schemas.js";
import { createProjectBody, updateProjectBody } from "../../src/presentation/projects/projects.schemas.js";
import {
  importIssuesBody,
  issuesQuery,
  linkRepositoryBody,
} from "../../src/presentation/github/github.schemas.js";

describe("task schemas", () => {
  it("parses a minimal task and defaults what it must not guess", () => {
    const parsed = createTaskBody.parse({ title: "Write tests" });
    expect(parsed.title).toBe("Write tests");
    expect(parsed.description).toBeUndefined();
    expect(parsed.startDate).toBeUndefined();
    expect(parsed.dueDate).toBeUndefined();
  });

  it("rejects an empty title, an unknown key, and a bogus status", () => {
    expect(createTaskBody.safeParse({ title: "   " }).success).toBe(false);
    expect(createTaskBody.safeParse({ title: "ok", id: "nope" }).success).toBe(false);
    expect(createTaskBody.safeParse({ title: "ok", status: "BLOCKED" }).success).toBe(false);
  });

  it("rejects an unparseable date and enforces the date order with the field named", () => {
    const badDate = createTaskBody.safeParse({ title: "x", dueDate: "2026-13-45" });
    expect(badDate.success).toBe(false);
    if (!badDate.success) {
      expect(badDate.error.issues.some((issue) => issue.message.includes("valid ISO-8601"))).toBe(true);
    }

    const reversed = createTaskBody.safeParse({
      title: "x",
      startDate: "2026-10-10",
      dueDate: "2026-10-01",
    });
    expect(reversed.success).toBe(false);
    if (!reversed.success) {
      expect(reversed.error.issues[0]?.path).toEqual(["dueDate"]);
    }
  });

  it("treats an empty PATCH as valid and every field as optional", () => {
    expect(updateTaskBody.parse({})).toEqual({});
    const full = updateTaskBody.parse({
      title: "renamed",
      description: null,
      status: "DONE",
      priority: "LOW",
      startDate: "2026-10-01",
      dueDate: null,
      projectId: null,
    });
    expect(full.status).toBe("DONE");
    expect(full.description).toBeNull();
    expect(full.dueDate).toBeNull();
  });

  it("applies list-query defaults, clamping, and comma-separated enums", () => {
    const defaults = taskListQuery.parse({});
    expect(defaults).toMatchObject({ page: 1, pageSize: 20, sortBy: "dueDate", sortOrder: "asc" });
    expect(defaults.status).toBeUndefined();

    expect(taskListQuery.parse({ pageSize: "500" }).pageSize).toBe(100);
    expect(taskListQuery.parse({ status: "TODO,DONE" }).status).toEqual(["TODO", "DONE"]);
    expect(taskListQuery.parse({ priority: ["HIGH"] }).priority).toEqual(["HIGH"]);

    expect(taskListQuery.safeParse({ page: 0 }).success).toBe(false);
    expect(taskListQuery.safeParse({ status: "NOPE" }).success).toBe(false);
    expect(taskListQuery.safeParse({ sortBy: "color" }).success).toBe(false);
  });
});

describe("project schemas", () => {
  it("requires a name and rejects unknown keys", () => {
    expect(createProjectBody.safeParse({ description: "nameless" }).success).toBe(false);
    expect(createProjectBody.safeParse({ name: "ok", userId: "leak" }).success).toBe(false);
    expect(createProjectBody.safeParse({ name: "   " }).success).toBe(false);
  });

  it("enforces targetDate >= startDate naming targetDate", () => {
    const reversed = createProjectBody.safeParse({
      name: "p",
      startDate: "2026-10-10",
      targetDate: "2026-10-01",
    });
    expect(reversed.success).toBe(false);
    if (!reversed.success) {
      expect(reversed.error.issues[0]?.path).toEqual(["targetDate"]);
    }
  });

  it("accepts explicit nulls and an empty PATCH", () => {
    const parsed = createProjectBody.parse({
      name: "nullable",
      description: null,
      startDate: null,
      targetDate: null,
    });
    expect(parsed.description).toBeNull();
    expect(updateProjectBody.parse({})).toEqual({});
    expect(updateProjectBody.parse({ targetDate: null }).targetDate).toBeNull();
  });
});

describe("github schemas", () => {
  it("accepts githubId as number or decimal string and converts to bigint", () => {
    expect(linkRepositoryBody.parse({ githubId: 1296269 }).githubId).toBe(1296269n);
    expect(linkRepositoryBody.parse({ githubId: "1296269" }).githubId).toBe(1296269n);
  });

  it("rejects zero, negatives, non-integers, junk strings, and unknown keys", () => {
    expect(linkRepositoryBody.safeParse({ githubId: 0 }).success).toBe(false);
    expect(linkRepositoryBody.safeParse({ githubId: -5 }).success).toBe(false);
    expect(linkRepositoryBody.safeParse({ githubId: 1.5 }).success).toBe(false);
    expect(linkRepositoryBody.safeParse({ githubId: "abc" }).success).toBe(false);
    expect(linkRepositoryBody.safeParse({ githubId: 1, projectId: "x" }).success).toBe(false);
  });

  it("bounds the import list: non-empty, ≤100, integers only", () => {
    expect(importIssuesBody.parse({ issueNumbers: [24] }).issueNumbers).toEqual([24]);
    expect(importIssuesBody.safeParse({ issueNumbers: [] }).success).toBe(false);
    expect(importIssuesBody.safeParse({ issueNumbers: Array.from({ length: 101 }, (_, i) => i + 1) }).success).toBe(false);
    expect(importIssuesBody.safeParse({ issueNumbers: [1.5] }).success).toBe(false);
    expect(importIssuesBody.safeParse({ issueNumbers: [0] }).success).toBe(false);
    expect(importIssuesBody.safeParse({ issueNumbers: [1], extra: true }).success).toBe(false);
  });

  it("applies issue-query defaults and bounds", () => {
    expect(issuesQuery.parse({})).toEqual({ state: "open", perPage: 30 });
    expect(issuesQuery.parse({ state: "all", perPage: "50", labels: "bug" })).toEqual({
      state: "all",
      perPage: 50,
      labels: "bug",
    });
    expect(issuesQuery.safeParse({ state: "weird" }).success).toBe(false);
    expect(issuesQuery.safeParse({ perPage: 101 }).success).toBe(false);
    expect(issuesQuery.safeParse({ perPage: 0 }).success).toBe(false);
    expect(issuesQuery.safeParse({ perPage: "many" }).success).toBe(false);
  });
});
