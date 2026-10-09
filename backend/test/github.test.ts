// Phase 11 integration tests (doc §11): every GitHub call is stubbed at the
// global `fetch`, so these run offline and deterministically. Local routes
// must keep working with GitHub unreachable — the §10 guarantee — which the
// outage test asserts in both directions.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { registerUser } from "./helpers.js";
import type { TestUser } from "./helpers.js";

const GITHUB_TOKEN = "ghp_test_token_never_serialised";

const repoFixture = {
  id: 1296269,
  name: "Task-Management-System",
  full_name: "TechVanguardVn/Task-Management-System",
  owner: { login: "TechVanguardVn" },
  description: "Mini project brief",
  visibility: "public",
  default_branch: "main",
  html_url: "https://github.com/TechVanguardVn/Task-Management-System",
};

const issueFixture = (number: number, state: "open" | "closed" = "open") => ({
  number,
  title: `Issue ${number}`,
  body: `Body for issue ${number}`,
  state,
  labels: [{ name: "bug" }, { name: "auth" }],
  user: { login: "dihie", avatar_url: "https://avatars.example/1" },
  created_at: "2026-10-02T08:11:00.000Z",
  updated_at: "2026-10-05T14:02:00.000Z",
  html_url: `https://github.com/TechVanguardVn/Task-Management-System/issues/${number}`,
});

function ghResponse(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Response;
}

function stubGitHub(handler: (url: string) => Response) {
  const mock = vi.fn(async (input: unknown, init?: RequestInit) => {
    void init;
    return handler(String(input));
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

async function registerGitHubUser(prefix: string): Promise<TestUser> {
  const user = await registerUser(prefix);
  await prisma.user.update({
    where: { id: user.id },
    data: { githubAccessToken: GITHUB_TOKEN },
  });
  return user;
}

async function createProject(user: TestUser, name = "GH Project"): Promise<string> {
  const res = await user.agent.post("/api/projects").send({ name });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function linkProject(user: TestUser, projectId: string, githubId = 1296269) {
  const res = await user.agent
    .post(`/api/projects/${projectId}/github-repository`)
    .send({ githubId });
  expect(res.status).toBe(200);
  return res;
}

function stubLinkedRepo() {
  return stubGitHub((url) => {
    if (url.includes("/repositories/1296269")) return ghResponse(200, repoFixture);
    throw new Error(`unexpected GitHub call: ${url}`);
  });
}

// `githubId` is globally unique, so tests cannot isolate by user the way the
// rest of the suite does — wipe the table instead. Deleting rows fires the
// schema's `SET NULL`, which is exactly production behaviour (§6.3).
beforeEach(async () => {
  await prisma.gitHubRepository.deleteMany();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GitHub integration — Phase 11", () => {
  it("lists repositories with githubId serialised as a string", async () => {
    const user = await registerGitHubUser("gh-list");
    const mock = stubGitHub((url) => {
      expect(url).toContain("/user/repos");
      return ghResponse(200, [repoFixture]);
    });

    const res = await user.agent.get("/api/github/repositories");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const repo = res.body.data[0];
    expect(repo).toEqual({
      githubId: "1296269",
      name: "Task-Management-System",
      fullName: "TechVanguardVn/Task-Management-System",
      owner: "TechVanguardVn",
      description: "Mini project brief",
      visibility: "public",
      defaultBranch: "main",
      url: "https://github.com/TechVanguardVn/Task-Management-System",
    });
    expect(typeof repo.githubId).toBe("string");
    const headers = (mock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${GITHUB_TOKEN}`);
  });

  it("returns 428 when the account has no GitHub token linked", async () => {
    const user = await registerUser("gh-notoken");

    const res = await user.agent.get("/api/github/repositories");

    expect(res.status).toBe(428);
    expect(res.body.error.code).toBe("PRECONDITION_FAILED");
  });

  it("linking a repository verifies access before persisting the association", async () => {
    const user = await registerGitHubUser("gh-link");
    const projectId = await createProject(user);
    const mock = stubLinkedRepo();

    const res = await linkProject(user, projectId);

    expect(res.body.data.fullName).toBe("TechVanguardVn/Task-Management-System");
    expect(
      mock.mock.calls.some(([url]) => String(url).includes("/repositories/1296269")),
    ).toBe(true);
    const stored = await prisma.gitHubRepository.findUnique({ where: { projectId } });
    expect(stored).not.toBeNull();
    expect(stored?.githubId).toBe(1296269n);
    expect(stored?.owner).toBe("TechVanguardVn");
  });

  it("linking a repository the caller cannot access returns 403", async () => {
    const user = await registerGitHubUser("gh-forbidden");
    const projectId = await createProject(user);
    stubGitHub(() => ghResponse(404, { message: "Not Found" }));

    const res = await user.agent
      .post(`/api/projects/${projectId}/github-repository`)
      .send({ githubId: 1296269 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    const stored = await prisma.gitHubRepository.findUnique({ where: { projectId } });
    expect(stored).toBeNull();
  });

  it("linking another user's project returns 404 without calling GitHub", async () => {
    const victim = await registerUser("gh-victim");
    const theirProject = await createProject(victim, "Their project");
    const attacker = await registerGitHubUser("gh-attacker");
    const mock = stubGitHub(() => {
      throw new Error("GitHub must not be called");
    });

    const res = await attacker.agent
      .post(`/api/projects/${theirProject}/github-repository`)
      .send({ githubId: 1296269 });

    expect(res.status).toBe(404);
    expect(mock).not.toHaveBeenCalled();
    const stored = await prisma.gitHubRepository.findUnique({ where: { projectId: theirProject } });
    expect(stored).toBeNull();
  });

  it("deleting the association keeps imported tasks (SET NULL)", async () => {
    const user = await registerGitHubUser("gh-unlink");
    const projectId = await createProject(user);
    stubLinkedRepo();
    await linkProject(user, projectId);
    const repository = await prisma.gitHubRepository.findUnique({ where: { projectId } });
    expect(repository).not.toBeNull();

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        projectId,
        githubRepositoryId: repository?.id ?? "",
        githubIssueNumber: 7,
        githubState: "closed",
        title: "Imported card",
      },
    });

    const res = await user.agent.delete(`/api/projects/${projectId}/github-repository`);
    expect(res.status).toBe(204);

    const after = await prisma.task.findUnique({ where: { id: task.id } });
    expect(after).not.toBeNull();
    expect(after?.githubRepositoryId).toBeNull();
    expect(after?.githubState).toBe("closed");
    const viaApi = await user.agent.get(`/api/tasks/${task.id}`);
    expect(viaApi.status).toBe(200);
    expect(viaApi.body.data.title).toBe("Imported card");
  });

  it("issue list returns every issue-list field", async () => {
    const user = await registerGitHubUser("gh-issues");
    const projectId = await createProject(user);
    stubGitHub((url) => {
      if (url.includes("/repositories/1296269")) return ghResponse(200, repoFixture);
      if (url.includes("/issues?")) return ghResponse(200, [issueFixture(24)]);
      throw new Error(`unexpected GitHub call: ${url}`);
    });
    await linkProject(user, projectId);

    const res = await user.agent.get("/api/github/repositories/1296269/issues");

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toEqual({
      number: 24,
      title: "Issue 24",
      body: "Body for issue 24",
      state: "open",
      labels: ["bug", "auth"],
      author: { login: "dihie", avatarUrl: "https://avatars.example/1" },
      createdAt: "2026-10-02T08:11:00.000Z",
      updatedAt: "2026-10-05T14:02:00.000Z",
      url: "https://github.com/TechVanguardVn/Task-Management-System/issues/24",
    });
  });

  it("passes the state filter through and defaults to open", async () => {
    const user = await registerGitHubUser("gh-state");
    const projectId = await createProject(user);
    const urls: string[] = [];
    stubGitHub((url) => {
      urls.push(url);
      if (url.includes("/repositories/1296269")) return ghResponse(200, repoFixture);
      return ghResponse(200, []);
    });
    await linkProject(user, projectId);

    expect((await user.agent.get("/api/github/repositories/1296269/issues?state=closed")).status).toBe(200);
    expect((await user.agent.get("/api/github/repositories/1296269/issues?state=all")).status).toBe(200);
    expect((await user.agent.get("/api/github/repositories/1296269/issues")).status).toBe(200);

    const issueCalls = urls.filter((url) => url.includes("/issues?"));
    expect(issueCalls[0]).toContain("state=closed");
    expect(issueCalls[1]).toContain("state=all");
    expect(issueCalls[2]).toContain("state=open");
  });

  it("imports a closed issue with status TODO — status independence", async () => {
    const user = await registerGitHubUser("gh-status");
    const projectId = await createProject(user);
    stubGitHub((url) => {
      if (url.includes("/repositories/1296269")) return ghResponse(200, repoFixture);
      if (url.includes("/issues?")) return ghResponse(200, [issueFixture(24, "closed")]);
      if (url.endsWith("/issues/24")) return ghResponse(200, issueFixture(24, "closed"));
      throw new Error(`unexpected GitHub call: ${url}`);
    });
    await linkProject(user, projectId);

    const listed = await user.agent.get("/api/github/repositories/1296269/issues?state=all");
    expect(listed.body.data[0].state).toBe("closed");

    const res = await user.agent
      .post(`/api/projects/${projectId}/import-issues`)
      .send({ issueNumbers: [24] });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ imported: [24], skipped: [] });

    const tasks = await user.agent.get(`/api/tasks?projectId=${projectId}`);
    expect(tasks.status).toBe(200);
    expect(tasks.body.data).toHaveLength(1);
    const task = tasks.body.data[0];
    expect(task.status).toBe("TODO");
    expect(task.githubState).toBe("closed");
    expect(task.githubIssueNumber).toBe(24);
    expect(task.title).toBe("Issue 24");
  });

  it("re-importing issues is idempotent", async () => {
    const user = await registerGitHubUser("gh-idem");
    const projectId = await createProject(user);
    stubGitHub((url) => {
      if (url.includes("/repositories/1296269")) return ghResponse(200, repoFixture);
      if (url.endsWith("/issues/24")) return ghResponse(200, issueFixture(24));
      if (url.endsWith("/issues/25")) return ghResponse(200, issueFixture(25));
      throw new Error(`unexpected GitHub call: ${url}`);
    });
    await linkProject(user, projectId);

    const first = await user.agent
      .post(`/api/projects/${projectId}/import-issues`)
      .send({ issueNumbers: [24, 25] });
    expect(first.body.data).toEqual({ imported: [24, 25], skipped: [] });

    const second = await user.agent
      .post(`/api/projects/${projectId}/import-issues`)
      .send({ issueNumbers: [24, 25] });
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual({ imported: [], skipped: [24, 25] });

    const tasks = await user.agent.get(`/api/tasks?projectId=${projectId}`);
    expect(tasks.body.data).toHaveLength(2);
  });

  it("importing a nonexistent issue returns 422", async () => {
    const user = await registerGitHubUser("gh-missing");
    const projectId = await createProject(user);
    stubGitHub((url) => {
      if (url.includes("/repositories/1296269")) return ghResponse(200, repoFixture);
      if (url.endsWith("/issues/99")) return ghResponse(404, { message: "Not Found" });
      throw new Error(`unexpected GitHub call: ${url}`);
    });
    await linkProject(user, projectId);

    const res = await user.agent
      .post(`/api/projects/${projectId}/import-issues`)
      .send({ issueNumbers: [99] });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNPROCESSABLE");
    expect(res.body.error.message).toContain("#99");
  });

  it("maps a rate-limited GitHub response to 429 with the reset timestamp", async () => {
    const user = await registerGitHubUser("gh-rate");
    const mock = stubGitHub(() =>
      ghResponse(
        403,
        { message: "API rate limit exceeded" },
        { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1760000000" },
      ),
    );

    const res = await user.agent.get("/api/github/repositories");

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
    expect(res.body.error.message).toMatch(/Resets at \d{4}-\d{2}-\d{2}T/);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("retries GitHub 500 twice, then returns 502", async () => {
    const user = await registerGitHubUser("gh-500");
    const mock = stubGitHub(() => ghResponse(500, { message: "boom" }));

    const res = await user.agent.get("/api/github/repositories");

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("BAD_GATEWAY");
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it("a GitHub outage does not affect local /api/tasks", async () => {
    const user = await registerGitHubUser("gh-outage");
    stubGitHub(() => {
      throw new TypeError("fetch failed");
    });

    const local = await user.agent.get("/api/tasks");
    expect(local.status).toBe(200);
    expect(Array.isArray(local.body.data)).toBe(true);

    const degraded = await user.agent.get("/api/github/repositories");
    expect(degraded.status).toBe(502);
    expect(degraded.body.error.code).toBe("BAD_GATEWAY");
  });

  it("never leaks githubAccessToken in any GitHub response", async () => {
    const user = await registerGitHubUser("gh-leak");
    const projectId = await createProject(user);
    stubGitHub((url) => {
      if (url.includes("/repositories/1296269")) return ghResponse(200, repoFixture);
      if (url.includes("/issues?")) return ghResponse(200, [issueFixture(24)]);
      if (url.endsWith("/issues/24")) return ghResponse(200, issueFixture(24));
      return ghResponse(200, [repoFixture]);
    });

    const responses = await Promise.all([
      user.agent.get("/api/github/repositories"),
      linkProject(user, projectId),
      user.agent.get("/api/github/repositories/1296269/issues"),
      user.agent.post(`/api/projects/${projectId}/import-issues`).send({ issueNumbers: [24] }),
      user.agent.get("/api/auth/me"),
    ]);

    for (const res of responses) {
      expect(JSON.stringify(res.body)).not.toContain(GITHUB_TOKEN);
      expect(JSON.stringify(res.body)).not.toContain("githubAccessToken");
    }
  });
});
