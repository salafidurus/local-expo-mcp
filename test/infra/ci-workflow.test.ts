import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ci workflow", () => {
  it("uses a dependabot-safe install path and still runs commitlint, tests, and build", async () => {
    const workflowPath = path.resolve(".github/workflows/ci.yml");
    const workflow = (await readFile(workflowPath, "utf8")).replace(/\r\n/g, "\n");

    expect(workflow).toContain("github.actor == 'dependabot[bot]'");
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).toContain("bun install");
    expect(workflow).toContain("bun run commitlint");
    expect(workflow).toContain("Run tests");
    expect(workflow).toContain("Build");
    expect(workflow.indexOf("Build")).toBeLessThan(workflow.indexOf("Run tests"));
  });
});
