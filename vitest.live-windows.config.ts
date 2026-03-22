import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/live-windows/**/*.test.ts"],
    env: {
      LIVE_TESTS: "1",
      LIVE_WINDOWS_TESTS: "1"
    }
  }
});
