import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();
export const PASSWORD = "Sup3rSecret!pw";

export type Agent = ReturnType<typeof request.agent>;

let seq = 0;

export function agent(): Agent {
  return request.agent(app);
}

/** Unique per call so auth rate limits (keyed by IP + email) never collide. */
export function uniqueEmail(prefix = "user"): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}@example.com`;
}

export interface TestUser {
  id: string;
  email: string;
  agent: Agent;
}

/** Registers a fresh user and returns an authenticated agent for them. */
export async function registerUser(prefix = "user"): Promise<TestUser> {
  const a = agent();
  const email = uniqueEmail(prefix);
  const res = await a
    .post("/api/auth/register")
    .send({ email, password: PASSWORD, displayName: "Test User" });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${res.text}`);
  }
  return { id: res.body.data.id as string, email, agent: a };
}

/** `YYYY-MM-DD` in the local calendar, the format the API parses as UTC midnight. */
export function dateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysFromToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
