import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Tests share one database and one in-memory rate limiter; files run one
    // at a time so fixtures from different files never interleave.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5432/todogit_test?schema=public",
    },
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
