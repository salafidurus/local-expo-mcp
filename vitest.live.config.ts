import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/live/**/*.test.ts"],
    env: {
      LIVE_TESTS: "1"
    }
  }
});
