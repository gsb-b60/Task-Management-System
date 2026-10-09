import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5004),
  // Comma-separated allow-list, e.g. "http://localhost:5173,http://localhost:8080".
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/todogit?schema=public"),
  JWT_SECRET: z.string().default("development-secret-key-change-in-production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().default(12),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  GITHUB_CALLBACK_URL: z
    .string()
    .default("http://localhost:5004/api/auth/github/callback"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment variables:\n${details}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/** Split a comma-separated CORS allow-list into individual origins. */
export function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** FRONTEND_ORIGIN split into individual origins for the CORS allow-list. */
export const frontendOrigins: string[] = parseOrigins(env.FRONTEND_ORIGIN);
