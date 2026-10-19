import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JWT_SECRET: "test-secret-for-unit-tests",
      GITHUB_CLIENT_ID: "test-client-id",
      GITHUB_CLIENT_SECRET: "test-client-secret",
      ANTHROPIC_API_KEY: "sk-ant-test",
    },
  },
});
