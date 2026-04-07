import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("releases on push to main with a guard against release-commit loops", async () => {
    const workflowPath = path.resolve(".github/workflows/release.yml");
    const workflow = (await readFile(workflowPath, "utf8")).replace(/\r\n/g, "\n");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain('chore(release):');
    expect(workflow).toContain('skip=true');
    expect(workflow).toContain("bun run release:do");
    expect(workflow).toContain("bun run release:publish");
    expect(workflow).toContain('gh release create "$tag"');
    expect(workflow).toContain('[skip ci]');
    expect(workflow).not.toContain("release/next");
    expect(workflow).not.toContain("prepare_release_pr");
    expect(workflow).not.toContain("release-plan.json");
    expect(workflow).not.toContain("RELEASE_PR_TITLE");
    expect(workflow).not.toContain("RELEASE_PR_BODY");
    expect(workflow).not.toContain("semantic-release");
    expect(workflow.indexOf("Build")).toBeLessThan(workflow.indexOf("Run tests"));
  });

  it("uses repo-owned release scripts instead of semantic-release config", async () => {
    const scriptPath = path.resolve("scripts/do-release.ts");
    const script = await readFile(scriptPath, "utf8");

    expect(script).toContain("analyzeReleasePlan");
    expect(script).toContain("readCommitsSinceTag");
    expect(script).toContain("parseUnreleased");
    expect(script).toContain("upsertReleaseChangelog");
  });
});
