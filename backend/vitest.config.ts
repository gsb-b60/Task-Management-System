import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/todogit_test?schema=public";

// Coverage gate (Phase 10 §6). A shortfall fails `pnpm test:coverage`, which
// is exactly what CI runs. Generated Prisma client code lives in
// node_modules and is excluded by default; configs are not executable paths.
const THRESHOLDS = {
  lines: 80,
  branches: 75,
  functions: 85,
};

export default defineConfig({
  test: {
    // Integration files share one database and one in-memory rate limiter;
    // unit tests never touch either. Serialising everything keeps both
    // guarantees trivially true.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
    },
    testTimeout: 15_000,
    hookTimeout: 30_000,
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["test/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["test/**/*.test.ts"],
          exclude: ["test/unit/**"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["**/*.config.ts"],
      thresholds: THRESHOLDS,
    },
  },
});
