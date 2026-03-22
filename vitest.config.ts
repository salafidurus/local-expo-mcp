import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/unit/**/*.test.ts", "test/infra/**/*.test.ts", "test/integration/**/*.test.ts"],
    exclude: ["test/windows/**/*.test.ts", "test/live/**/*.test.ts", "test/live-windows/**/*.test.ts"]
  }
});
