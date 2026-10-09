import { describe, expect, it } from "vitest";
import { PASSWORD, agent, registerUser, uniqueEmail } from "./helpers.js";

describe("POST /api/auth/register", () => {
  it("creates a user, returns 201, and sets an HttpOnly session cookie", async () => {
    const a = agent();
    const email = uniqueEmail("reg");
    const res = await a
      .post("/api/auth/register")
      .send({ email, password: PASSWORD, displayName: "Reg User" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email, displayName: "Reg User" });
    expect(res.body.data.id).toEqual(expect.any(String));
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.githubAccessToken).toBeUndefined();

    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toContain("gpm_session=");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("rejects a malformed email with field-level details", async () => {
    const res = await agent()
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "email" }),
    ]);
  });

  it("rejects a password under 8 characters", async () => {
    const res = await agent()
      .post("/api/auth/register")
      .send({ email: uniqueEmail("shortpw"), password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "password" }),
    ]);
  });

  it("returns 409 for an email already in use", async () => {
    const email = uniqueEmail("dup");
    const a = agent();
    await a.post("/api/auth/register").send({ email, password: PASSWORD });
    const res = await agent()
      .post("/api/auth/register")
      .send({ email, password: PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and sets the cookie", async () => {
    const user = await registerUser("login-ok");
    const res = await agent()
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.headers["set-cookie"]?.[0]).toContain("gpm_session=");
  });

  it("returns byte-identical 401s for wrong password and unknown email", async () => {
    const user = await registerUser("login-identical");
    const wrongPassword = await agent()
      .post("/api/auth/login")
      .send({ email: user.email, password: "definitely-wrong" });
    const unknownEmail = await agent()
      .post("/api/auth/login")
      .send({ email: uniqueEmail("ghost"), password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("UNAUTHENTICATED");
    expect(unknownEmail.body.error.code).toBe("UNAUTHENTICATED");
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the session user without password material", async () => {
    const user = await registerUser("me");
    const res = await user.agent.get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: user.id,
      email: user.email,
      displayName: "Test User",
    });
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.createdAt).toBeUndefined();
  });

  it("returns 401 without a session", async () => {
    const res = await agent().get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("POST /api/auth/logout", () => {
  it("invalidates the session: 204, then 401 on /me", async () => {
    const user = await registerUser("logout");
    const before = await user.agent.get("/api/auth/me");
    expect(before.status).toBe(200);

    const out = await user.agent.post("/api/auth/logout");
    expect(out.status).toBe(204);

    const after = await user.agent.get("/api/auth/me");
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("UNAUTHENTICATED");
  });
});
