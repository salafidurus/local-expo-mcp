import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ci workflow", () => {
  it("runs commitlint in pull request validation", async () => {
    const workflowPath = path.resolve(".github/workflows/ci.yml");
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("bun run commitlint");
    expect(workflow).toContain("Run tests");
    expect(workflow).toContain("Build");
  });
});
