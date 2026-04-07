import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("releases on push to main using a release PR flow that respects protected branches", async () => {
    const workflowPath = path.resolve(".github/workflows/release.yml");
    const workflow = (await readFile(workflowPath, "utf8")).replace(/\r\n/g, "\n");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain('chore(release):');
    expect(workflow).toContain("mode=publish");
    expect(workflow).toContain("mode=prepare");
    expect(workflow).toContain("bun run release:do");
    expect(workflow).toContain("bun run release:publish");
    expect(workflow).toContain('git checkout -B release/next');
    expect(workflow).toContain('git push --force-with-lease origin release/next');
    expect(workflow).toContain('gh pr create --base main --head release/next');
    expect(workflow).toContain('gh pr edit release/next --base main');
    expect(workflow).toContain('git push origin "$tag"');
    expect(workflow).toContain('gh release create "$tag"');
    expect(workflow).not.toContain('git push origin main');
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
