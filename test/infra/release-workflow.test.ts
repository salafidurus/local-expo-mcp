import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("prepares a release PR from publish-labeled merges and publishes only after the release PR is merged", async () => {
    const workflowPath = path.resolve(".github/workflows/release.yml");
    const workflow = (await readFile(workflowPath, "utf8")).replace(/\r\n/g, "\n");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("schedule:");
    expect(workflow).toContain("for attempt in 1 2 3 4 5; do");
    expect(workflow).toContain('sleep 2');
    expect(workflow).toContain('prepare_release_pr');
    expect(workflow).toContain('publish_release');
    expect(workflow).toContain('.head.ref != "release/next"');
    expect(workflow).toContain('.head.ref == "release/next"');
    expect(workflow).toContain('bun run release:prepare-pr');
    expect(workflow).toContain('git checkout -B release/next');
    expect(workflow).toContain('gh pr create --base main --head release/next');
    expect(workflow).toContain('gh pr edit release/next');
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.SALAFIDURUS_PR_WRITE }}');
    expect(workflow).not.toContain('--label release');
    expect(workflow).toContain('bun run release:publish');
    expect(workflow).toContain('gh release create "$tag"');
    expect(workflow).not.toContain('semantic-release');
    expect(workflow).not.toContain('registry-url:');
    expect(workflow.indexOf('Build')).toBeLessThan(workflow.indexOf('Run tests'));
  });

  it("uses repo-owned release scripts instead of semantic-release config", async () => {
    const scriptPath = path.resolve("scripts/create-release-pr.ts");
    const script = await readFile(scriptPath, "utf8");

    expect(script).toContain('const RELEASE_BRANCH = "release/next"');
    expect(script).toContain('analyzeReleasePlan');
    expect(script).toContain('mergeReleaseState');
    expect(script).toContain('renderReleasePrBody');
  });
});
