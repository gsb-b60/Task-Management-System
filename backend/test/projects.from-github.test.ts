// Bulk-add projects from GitHub repositories: one project per repository,
// each linked on creation. GitHub is stubbed at the global `fetch` like the
// Phase 11 suite — no network, deterministic results.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

const GITHUB_TOKEN = "ghp_test_token_never_serialised";

const repoFixture = (id: number, name: string) => ({
  id,
  name,
  full_name: `SomeOwner/${name}`,
  owner: { login: "SomeOwner" },
  description: `Description of ${name}`,
  visibility: "public",
  default_branch: "main",
  html_url: `https://github.com/SomeOwner/${name}`,
});

function ghResponse(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Response;
}

const issueFixture = (number: number, state: "open" | "closed", labels: string[] = []) => ({
  number,
  title: `Issue ${number}`,
  body: `Body ${number}`,
  state,
  labels: labels.map((name) => ({ name })),
  user: { login: "someone", avatar_url: null },
  created_at: "2026-10-02T08:11:00.000Z",
  updated_at: "2026-10-05T14:02:00.000Z",
  html_url: `https://github.com/SomeOwner/repo/issues/${number}`,
});

function stubGitHub(handler: (url: string) => Response) {
  const mock = vi.fn(async (input: unknown) => handler(String(input)));
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** Issues listing defaults to empty unless a test overrides it. */
function stubRepos(handler: (url: string) => Response) {
  return stubGitHub((url) => {
    if (url.includes("/issues")) return ghResponse(200, []);
    return handler(url);
  });
}

async function registerGitHubUser(prefix: string): Promise<TestUser> {
  const user = await registerUser(prefix);
  await prisma.user.update({
    where: { id: user.id },
    data: { githubAccessToken: GITHUB_TOKEN },
  });
  return user;
}

// `githubId` is globally unique — wipe links so parallel files using their own
// ids never collide with these rows.
beforeEach(async () => {
  await prisma.gitHubRepository.deleteMany();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/projects/from-github", () => {
  it("creates one linked project per repository", async () => {
    const user = await registerGitHubUser("gh-bulk-new");
    stubRepos((url) => {
      if (url.includes("/repositories/7100001")) return ghResponse(200, repoFixture(7100001, "alpha"));
      throw new Error(`unexpected GitHub call: ${url}`);
    });

    const res = await user.agent.post("/api/projects/from-github").send({
      items: [{ githubId: 7100001, name: "Alpha Project", description: "My alpha" }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.skipped).toEqual([]);
    expect(res.body.data.created).toHaveLength(1);
    const [entry] = res.body.data.created;
    expect(entry.project.name).toBe("Alpha Project");
    expect(entry.project.description).toBe("My alpha");
    expect(entry.project.projectNumber).toBe(1);
    expect(entry.project.taskCount).toBe(0);
    expect(entry.repository.fullName).toBe("SomeOwner/alpha");
    expect(entry.repository.githubId).toBe("7100001");

    const stored = await prisma.gitHubRepository.findUnique({
      where: { projectId: entry.project.id },
    });
    expect(stored?.fullName).toBe("SomeOwner/alpha");
  });

  it("defaults the description to the repository description", async () => {
    const user = await registerGitHubUser("gh-bulk-desc");
    stubRepos((url) => {
      if (url.includes("/repositories/7100004")) return ghResponse(200, repoFixture(7100004, "beta"));
      throw new Error(`unexpected GitHub call: ${url}`);
    });

    const res = await user.agent.post("/api/projects/from-github").send({
      items: [{ githubId: "7100004", name: "Beta" }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.created[0].project.description).toBe("Description of beta");
  });

  it("skips duplicates and inaccessible repos without failing siblings", async () => {
    const user = await registerGitHubUser("gh-bulk-mixed");
    stubRepos((url) => {
      if (url.includes("/repositories/7100002")) return ghResponse(200, repoFixture(7100002, "dup"));
      if (url.includes("/repositories/7100001")) return ghResponse(200, repoFixture(7100001, "alpha"));
      if (url.includes("/repositories/7100003")) return ghResponse(404, { message: "Not Found" });
      throw new Error(`unexpected GitHub call: ${url}`);
    });

    // Pre-link 7100002 so the bulk request meets a duplicate.
    const setup = await user.agent.post("/api/projects").send({ name: "Existing" });
    expect(setup.status).toBe(201);
    const linked = await user.agent
      .post(`/api/projects/${setup.body.data.id}/github-repository`)
      .send({ githubId: 7100002 });
    expect(linked.status).toBe(200);

    const res = await user.agent.post("/api/projects/from-github").send({
      items: [
        { githubId: 7100001, name: "Alpha Project" },
        { githubId: 7100002, name: "Dup Project" },
        { githubId: 7100003, name: "Ghost Project" },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.created.map((entry: { project: { name: string } }) => entry.project.name)).toEqual([
      "Alpha Project",
    ]);
    expect(res.body.data.skipped).toEqual([
      { githubId: "7100002", reason: "ALREADY_LINKED" },
      { githubId: "7100003", reason: "NOT_ACCESSIBLE" },
    ]);

    // Skips leave no orphan projects behind.
    const names = (
      await prisma.project.findMany({ where: { userId: user.id }, select: { name: true } })
    ).map((row) => row.name);
    expect(names).not.toContain("Dup Project");
    expect(names).not.toContain("Ghost Project");
  });

  it("returns 428 when no GitHub account is linked", async () => {
    const user = await registerUser("gh-bulk-notoken");

    const res = await user.agent.post("/api/projects/from-github").send({
      items: [{ githubId: 7100001, name: "Alpha" }],
    });

    expect(res.status).toBe(428);
    expect(res.body.error.code).toBe("PRECONDITION_FAILED");
  });

  it("rejects an empty selection and an invalid title", async () => {
    const user = await registerGitHubUser("gh-bulk-invalid");

    const empty = await user.agent.post("/api/projects/from-github").send({ items: [] });
    expect(empty.status).toBe(400);

    const blank = await user.agent.post("/api/projects/from-github").send({
      items: [{ githubId: 7100001, name: "   " }],
    });
    expect(blank.status).toBe(400);
  });

  it("imports every issue, mapping state and labels onto Kanban status", async () => {
    const user = await registerGitHubUser("gh-bulk-import");
    stubGitHub((url) => {
      if (url.includes("/repositories/7100006")) return ghResponse(200, repoFixture(7100006, "gamma"));
      if (url.includes("/issues")) {
        return ghResponse(200, [
          issueFixture(1, "open"),
          issueFixture(2, "open", ["WIP"]),
          issueFixture(3, "closed", ["in-progress"]),
        ]);
      }
      throw new Error(`unexpected GitHub call: ${url}`);
    });

    const res = await user.agent.post("/api/projects/from-github").send({
      items: [{ githubId: 7100006, name: "Gamma" }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.created[0].importedCount).toBe(3);

    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      select: { githubIssueNumber: true, status: true, githubState: true },
      orderBy: { githubIssueNumber: "asc" },
    });
    expect(tasks).toEqual([
      { githubIssueNumber: 1, status: "TODO", githubState: "open" },
      { githubIssueNumber: 2, status: "IN_PROGRESS", githubState: "open" },
      { githubIssueNumber: 3, status: "DONE", githubState: "closed" },
    ]);
  });

  it("follows issue pagination until the last page", async () => {
    const user = await registerGitHubUser("gh-bulk-pages");
    const nextLink =
      '<https://api.github.com/repos/SomeOwner/delta/issues?state=all&per_page=100&page=2>; rel="next"';
    stubGitHub((url) => {
      if (url.includes("/repositories/7100007")) return ghResponse(200, repoFixture(7100007, "delta"));
      if (url.includes("/issues")) {
        if (url.includes("page=2")) return ghResponse(200, [issueFixture(2, "open")]);
        return ghResponse(200, [issueFixture(1, "open")], { link: nextLink });
      }
      throw new Error(`unexpected GitHub call: ${url}`);
    });

    const res = await user.agent.post("/api/projects/from-github").send({
      items: [{ githubId: 7100007, name: "Delta" }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.created[0].importedCount).toBe(2);
  });
});
