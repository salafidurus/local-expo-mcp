import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("husky hooks", () => {
  it("runs non-live test suites and the build on pre-push", async () => {
    const hookPath = path.resolve(".husky/pre-push");
    const hook = await readFile(hookPath, "utf8");

    expect(hook).toContain("bun run test");
    expect(hook).toContain("bun run test:windows");
    expect(hook).toContain("bun run build");
    expect(hook).not.toContain("test:live");
    expect(hook).not.toContain("husky.sh");
  });
});
