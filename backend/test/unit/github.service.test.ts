// Unit tests for the three GitHub profile cases (§5.1): full profile,
// email fallback via /user/emails, and the unusable-profile rejection — plus
// the OAuth exchange/authorize branch edges. `fetch` is stubbed globally and
// `env` is mutated and restored in place: no network, no database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchGitHubProfile,
  isGitHubOAuthConfigured,
} from "../../src/service/github.service.js";
import { env } from "../../src/config/env.js";
import { AppError } from "../../src/lib/errors.js";

function ghResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  } as unknown as Response;
}

const originalClientId = env.GITHUB_CLIENT_ID;
const originalClientSecret = env.GITHUB_CLIENT_SECRET;

beforeEach(() => {
  env.GITHUB_CLIENT_ID = originalClientId;
  env.GITHUB_CLIENT_SECRET = originalClientSecret;
});

afterEach(() => {
  env.GITHUB_CLIENT_ID = originalClientId;
  env.GITHUB_CLIENT_SECRET = originalClientSecret;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("github.service.ts profile linking (Phase 01 unit)", () => {
  it("uses the profile email when GitHub provides one", async () => {
    const mock = vi.fn(async (input: unknown) => {
      expect(String(input)).toMatch(/\/user$/);
      return ghResponse({
        id: 42,
        login: "dihie",
        email: "dihie@example.com",
        name: "Di Hie",
      });
    });
    vi.stubGlobal("fetch", mock);

    const profile = await fetchGitHubProfile("ghp_token");
    expect(profile).toEqual({
      githubId: "42",
      githubLogin: "dihie",
      email: "dihie@example.com",
      name: "Di Hie",
      accessToken: "ghp_token",
    });
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the primary verified address from /user/emails", async () => {
    const mock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return ghResponse({ id: 7, login: "octo", email: null, name: null });
      }
      if (url.endsWith("/user/emails")) {
        return ghResponse([
          { email: "secondary@example.com", primary: false, verified: true },
          { email: "primary@example.com", primary: true, verified: true },
        ]);
      }
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal("fetch", mock);

    const profile = await fetchGitHubProfile("ghp_token");
    expect(profile.email).toBe("primary@example.com");
    expect(profile.name).toBeNull();
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("rejects an unusable profile with VALIDATION_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ghResponse({ login: "no-id-here" })),
    );

    await expect(fetchGitHubProfile("ghp_token")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(fetchGitHubProfile("ghp_token")).rejects.toBeInstanceOf(AppError);
  });

  it("rejects when GitHub is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(fetchGitHubProfile("ghp_token")).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a non-ok /user response (githubGet returns null)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response),
    );

    await expect(fetchGitHubProfile("ghp_token")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects when the /user body is not JSON (githubGet catch → null)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }) as unknown as Response),
    );

    await expect(fetchGitHubProfile("ghp_token")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects an id without a login", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ghResponse({ id: 9, name: "NoLogin" })));

    await expect(fetchGitHubProfile("ghp_token")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("treats an empty profile email like null and falls back to /user/emails", async () => {
    const mock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return ghResponse({ id: 3, login: "octo", email: "", name: "" });
      }
      return ghResponse([{ email: "fallback@example.com", primary: true, verified: true }]);
    });
    vi.stubGlobal("fetch", mock);

    const profile = await fetchGitHubProfile("ghp_token");
    expect(profile.email).toBe("fallback@example.com");
    expect(profile.name).toBeNull();
  });

  it("keeps email null when /user/emails is unavailable or unusable", async () => {
    const failing = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return ghResponse({ id: 3, login: "octo", email: null });
      }
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    });
    vi.stubGlobal("fetch", failing);
    const unreachable = await fetchGitHubProfile("ghp_token");
    expect(unreachable.email).toBeNull();

    const empty = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return ghResponse({ id: 4, login: "octo2", email: null });
      }
      return ghResponse([]);
    });
    vi.stubGlobal("fetch", empty);
    const noPrimary = await fetchGitHubProfile("ghp_token");
    expect(noPrimary.email).toBeNull();

    const blank = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return ghResponse({ id: 5, login: "octo3", email: null });
      }
      return ghResponse([{ email: "", primary: true, verified: true }]);
    });
    vi.stubGlobal("fetch", blank);
    const blankEmail = await fetchGitHubProfile("ghp_token");
    expect(blankEmail.email).toBeNull();
  });
});

describe("github.service.ts OAuth exchange (Phase 10 unit)", () => {
  it("reports configuration as the AND of both credentials", () => {
    env.GITHUB_CLIENT_ID = "";
    env.GITHUB_CLIENT_SECRET = "";
    expect(isGitHubOAuthConfigured()).toBe(false);

    env.GITHUB_CLIENT_ID = "id-only";
    env.GITHUB_CLIENT_SECRET = "";
    expect(isGitHubOAuthConfigured()).toBe(false);

    env.GITHUB_CLIENT_ID = "";
    env.GITHUB_CLIENT_SECRET = "secret-only";
    expect(isGitHubOAuthConfigured()).toBe(false);

    env.GITHUB_CLIENT_ID = "id";
    env.GITHUB_CLIENT_SECRET = "secret";
    expect(isGitHubOAuthConfigured()).toBe(true);
  });

  it("builds the authorize URL with and without state", () => {
    env.GITHUB_CLIENT_ID = "cid";
    const withoutState = new URL(buildAuthorizeUrl());
    expect(withoutState.searchParams.has("state")).toBe(false);
    expect(withoutState.searchParams.get("scope")).toBe("read:user user:email");
    expect(withoutState.searchParams.get("client_id")).toBe("cid");

    const emptyState = new URL(buildAuthorizeUrl(""));
    expect(emptyState.searchParams.has("state")).toBe(false);

    const withState = new URL(buildAuthorizeUrl("abc123"));
    expect(withState.searchParams.get("state")).toBe("abc123");
  });

  it("refuses to exchange when OAuth is not configured", async () => {
    env.GITHUB_CLIENT_ID = "";
    env.GITHUB_CLIENT_SECRET = "";

    await expect(exchangeCodeForToken("code")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("exchanges a valid code for the access token", async () => {
    env.GITHUB_CLIENT_ID = "cid";
    env.GITHUB_CLIENT_SECRET = "csecret";
    const mock = vi.fn(async () => ghResponse({ access_token: "gho_abc" }));
    vi.stubGlobal("fetch", mock);

    await expect(exchangeCodeForToken("the-code")).resolves.toBe("gho_abc");
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("maps network failure, non-ok, missing token, empty token, and bad JSON to 401", async () => {
    env.GITHUB_CLIENT_ID = "cid";
    env.GITHUB_CLIENT_SECRET = "csecret";
    const expectUnauthorized = (promise: Promise<string>) =>
      expect(promise).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expectUnauthorized(exchangeCodeForToken("x"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response),
    );
    await expectUnauthorized(exchangeCodeForToken("x"));

    vi.stubGlobal("fetch", vi.fn(async () => ghResponse({ error: "bad_verification_code" })));
    await expectUnauthorized(exchangeCodeForToken("x"));

    vi.stubGlobal("fetch", vi.fn(async () => ghResponse({ access_token: "" })));
    await expectUnauthorized(exchangeCodeForToken("x"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("not json");
        },
      }) as unknown as Response),
    );
    await expectUnauthorized(exchangeCodeForToken("x"));
  });
});
