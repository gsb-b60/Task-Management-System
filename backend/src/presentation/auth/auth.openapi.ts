import { envelope, errors, type OperationSpec } from "../openapi/openapi.js";
import { loginBody, registerBody, updateMeBody } from "./auth.schemas.js";

const authUserSchema = {
  type: "object",
  required: ["id", "email", "displayName", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string" },
    displayName: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

export const AUTH_OPERATIONS: Record<string, OperationSpec> = {
  "POST /api/auth/register": {
    tag: "Auth",
    summary: "Register an email account",
    description:
      "Creates an account and opens a session. Rate limited to 5 attempts per window.",
    auth: false,
    requestBody: { schema: registerBody },
    responses: [
      { status: 201, description: "Account created; session cookie set", schema: envelope(authUserSchema) },
      ...errors(400, 409, 429),
    ],
  },
  "POST /api/auth/login": {
    tag: "Auth",
    summary: "Sign in with email and password",
    description: "Rate limited to 10 attempts per window. Wrong email and wrong password answer alike.",
    auth: false,
    requestBody: { schema: loginBody },
    responses: [
      { status: 200, description: "Signed in; session cookie set", schema: envelope(authUserSchema) },
      ...errors(400, 401, 429),
    ],
  },
  "POST /api/auth/logout": {
    tag: "Auth",
    summary: "End the session",
    auth: false,
    responses: [{ status: 204, description: "Session cleared" }, ...errors(401)],
  },
  "GET /api/auth/me": {
    tag: "Auth",
    summary: "Current session user",
    auth: true,
    responses: [{ status: 200, description: "The signed-in user", schema: envelope(authUserSchema) }, ...errors(401)],
  },
  "PATCH /api/auth/me": {
    tag: "Auth",
    summary: "Update the profile",
    description: "Partial update — omitted fields keep their values, explicit null clears the display name.",
    auth: true,
    requestBody: { schema: updateMeBody },
    responses: [
      { status: 200, description: "The updated user", schema: envelope(authUserSchema) },
      ...errors(400, 401, 404),
    ],
  },
  "GET /api/auth/github": {
    tag: "Auth",
    summary: "Start GitHub OAuth",
    description: "Redirects the browser to GitHub's authorize endpoint.",
    auth: false,
    responses: [
      { status: 302, description: "Redirect to GitHub" },
      ...errors(400),
    ],
  },
  "DELETE /api/auth/github": {
    tag: "Auth",
    summary: "Disconnect GitHub",
    description:
      "Clears the account link only — projects, their repository rows, and imported tasks are untouched.",
    auth: true,
    responses: [
      { status: 200, description: "The user without its GitHub link", schema: envelope(authUserSchema) },
      ...errors(401, 404),
    ],
  },
  "GET /api/auth/github/callback": {
    tag: "Auth",
    summary: "GitHub OAuth callback",
    description:
      "Exchanges the code for a token, links or creates the account, and opens a session.",
    auth: false,
    params: [
      {
        name: "code",
        in: "query",
        required: true,
        description: "Authorization code from GitHub",
        schema: { type: "string" },
      },
    ],
    responses: [
      { status: 200, description: "Signed in; session cookie set", schema: envelope(authUserSchema) },
      { status: 302, description: "Browser navigation: redirect to the SPA with the session cookie set" },
      ...errors(401),
    ],
  },
};
