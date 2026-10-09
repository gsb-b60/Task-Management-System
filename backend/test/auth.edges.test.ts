// Phase 10 §5.2 — auth paths the core suite never reaches: optional fields,
// idempotent logout, bogus/expired sessions, the OAuth authorize + callback
// legs, and all three GitHub linking cases (already-linked, email match,
// brand-new OAuth user).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agent, PASSWORD, registerUser, uniqueEmail } from "./helpers.js";
import { env } from "../src/config/env.js";
import { SESSION_COOKIE } from "../src/lib/cookies.js";
import { prisma } from "../src/lib/prisma.js";
import { createSession } from "../src/repository/session.repository.js";
import { linkGitHubUser } from "../src/service/auth.service.js";
import { generateSessionToken, hashSessionToken } from "../src/service/token.js";

function ghResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as unknown as Response;
}

/** Stubs both halves of the callback flow: token exchange, then /user. */
function stubOAuthFlow(profile: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("/login/oauth/access_token")) return ghResponse({ access_token: "gho_oauth" });
      if (url.endsWith("/user")) return ghResponse(profile);
      throw new Error(`unexpected call: ${url}`);
    }),
  );
}

const originalClientId = env.GITHUB_CLIENT_ID;
const originalClientSecret = env.GITHUB_CLIENT_SECRET;

beforeEach(() => {
  env.GITHUB_CLIENT_ID = "client-id";
  env.GITHUB_CLIENT_SECRET = "client-secret";
});

afterEach(() => {
  env.GITHUB_CLIENT_ID = originalClientId;
  env.GITHUB_CLIENT_SECRET = originalClientSecret;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("auth edge paths (Phase 10)", () => {
  // The test database outlives a single run, so every GitHub profile id (and
  // anything derived from it) must be fresh or a previous run's already-linked
  // row would satisfy the lookup instead of the path under test.
  const runStamp = Date.now();

  it("register without displayName defaults to null", async () => {
    const email = uniqueEmail("no-display-name");
    const res = await agent().post("/api/auth/register").send({ email, password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.data.displayName).toBeNull();
  });

  it("logout without a cookie is a successful no-op", async () => {
    const res = await agent().post("/api/auth/logout");
    expect(res.status).toBe(204);
  });

  it("rejects a bogus session token", async () => {
    const res = await agent()
      .get("/api/auth/me")
      .set("Cookie", `${SESSION_COOKIE}=not-a-real-session-token`);

    expect(res.status).toBe(401);
  });

  it("rejects an expired session and deletes the row", async () => {
    const user = await registerUser("expired-session");
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    await createSession({ tokenHash, userId: user.id, expiresAt: new Date(Date.now() - 1_000) });

    const res = await agent().get("/api/auth/me").set("Cookie", `${SESSION_COOKIE}=${token}`);

    expect(res.status).toBe(401);
    const rows = await prisma.session.findMany({ where: { token: tokenHash } });
    expect(rows).toHaveLength(0);
  });

  it("authorize redirects when configured and 400s when not", async () => {
    env.GITHUB_CLIENT_ID = "";
    env.GITHUB_CLIENT_SECRET = "";
    const denied = await agent().get("/api/auth/github");
    expect(denied.status).toBe(400);
    expect(denied.body.error.code).toBe("VALIDATION_ERROR");

    env.GITHUB_CLIENT_ID = "cid";
    env.GITHUB_CLIENT_SECRET = "csecret";
    const ok = await agent().get("/api/auth/github");
    expect(ok.status).toBe(302);
    expect(ok.headers["location"]).toContain("github.com/login/oauth/authorize");
    expect(ok.headers["location"]).toContain("client_id=cid");
  });

  it("callback without a code is 401", async () => {
    const res = await agent().get("/api/auth/github/callback");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("callback redirects a browser back to the SPA with the session cookie", async () => {
    const login = `htmlnav-${runStamp}`;
    stubOAuthFlow({ id: runStamp + 71, login, email: null, name: null });

    const res = await agent()
      .get("/api/auth/github/callback?code=abc")
      .set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toBe("http://localhost:5173/auth/github/callback");
    expect(res.headers["set-cookie"]?.[0] ?? "").toContain("gpm_session=");
  });

  it("callback forwards a GitHub denial to the SPA error screen, 401 for JSON", async () => {
    const browser = await agent()
      .get("/api/auth/github/callback?error=access_denied")
      .set("Accept", "text/html");
    expect(browser.status).toBe(302);
    expect(browser.headers["location"]).toBe(
      "http://localhost:5173/auth/github/callback?error=access_denied",
    );

    const json = await agent().get("/api/auth/github/callback?error=access_denied");
    expect(json.status).toBe(401);
    expect(json.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("callback sends a browser to the SPA error screen when the exchange fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({ ok: false, status: 502, headers: new Headers(), json: async () => ({}) }) as unknown as Response,
      ),
    );

    const res = await agent()
      .get("/api/auth/github/callback?code=abc")
      .set("Accept", "text/html");

    expect(res.status).toBe(302);
    expect(res.headers["location"]).toBe(
      "http://localhost:5173/auth/github/callback?error=exchange_failed",
    );
  });

  it("callback links an email match, then logs the same user back in", async () => {
    const existing = await registerUser("oauth-email-match");
    const githubId = runStamp + 1;
    stubOAuthFlow({ id: githubId, login: "matchgh", email: existing.email, name: "Match GH" });

    const first = await agent().get("/api/auth/github/callback?code=abc");
    expect(first.status).toBe(200);
    expect(first.body.data.id).toBe(existing.id);

    const linked = await prisma.user.findUnique({ where: { id: existing.id } });
    expect(linked?.githubId).toBe(String(githubId));
    expect(linked?.githubLogin).toBe("matchgh");

    // Second visit: the account is already linked, so it simply logs in.
    const second = await agent().get("/api/auth/github/callback?code=abc");
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(existing.id);
  });

  it("re-linking an already-linked account refreshes the stored token", async () => {
    const login = `retoken-${runStamp}`;
    const githubId = runStamp + 101;
    let token = "gho_first";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(input);
        if (url.includes("/login/oauth/access_token")) return ghResponse({ access_token: token });
        if (url.endsWith("/user"))
          return ghResponse({ id: githubId, login, email: null, name: null });
        throw new Error(`unexpected call: ${url}`);
      }),
    );

    const first = await agent().get("/api/auth/github/callback?code=abc");
    expect(first.status).toBe(200);
    const userId = first.body.data.id as string;
    const storedFirst = await prisma.user.findUnique({ where: { id: userId } });
    expect(storedFirst?.githubAccessToken).toBe("gho_first");

    // The stored token is stale (e.g. revoked or never persisted): a fresh
    // OAuth run must heal it, not just issue a new session.
    token = "gho_second";
    const second = await agent().get("/api/auth/github/callback?code=abc");
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(userId);
    const storedSecond = await prisma.user.findUnique({ where: { id: userId } });
    expect(storedSecond?.githubAccessToken).toBe("gho_second");
  });

  it("callback creates a new OAuth user with noreply email and login as display name", async () => {
    const login = `newbie-${runStamp}`;
    stubOAuthFlow({ id: runStamp + 2, login, email: null, name: null });

    const res = await agent().get("/api/auth/github/callback?code=abc");

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(`${login}@users.noreply.github.com`);
    expect(res.body.data.displayName).toBe(login);
  });

  it("callback keeps the GitHub display name when the profile provides one", async () => {
    const login = `named-${runStamp}`;
    stubOAuthFlow({ id: runStamp + 3, login, email: null, name: "Real Name" });

    const res = await agent().get("/api/auth/github/callback?code=abc");

    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe("Real Name");
    expect(res.body.data.email).toBe(`${login}@users.noreply.github.com`);
  });

  it("linkGitHubUser rejects unusable profiles and accepts a blank email", async () => {
    await expect(
      linkGitHubUser({ githubId: "", githubLogin: "x", email: null, name: null, accessToken: "t" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      linkGitHubUser({ githubId: "444444", githubLogin: "", email: null, name: null, accessToken: "t" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    // `email: ""` is unique in the schema, so drop rows from earlier runs to
    // exercise the create path every time.
    await prisma.user.deleteMany({ where: { email: "" } });
    const blank = await linkGitHubUser({
      githubId: String(runStamp + 4),
      githubLogin: "blankmail",
      email: "",
      name: null,
      accessToken: "t",
    });
    expect(blank.user.email).toBe("");
    expect(blank.user.displayName).toBe("blankmail");
  });
});
