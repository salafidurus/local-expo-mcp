import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("releases on every push to main in a single workflow run with no staging PR", async () => {
    const workflowPath = path.resolve(".github/workflows/release.yml");
    const workflow = (await readFile(workflowPath, "utf8")).replace(/\r\n/g, "\n");

    // Triggers
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("- main");

    // Guard skips release commits to avoid infinite loop
    expect(workflow).toContain("chore(release):");
    expect(workflow).toContain("skip=true");
    expect(workflow).toContain("skip=false");

    // Single-pass: prepare then immediately commit, tag, publish
    expect(workflow).toContain("bun run release:do");
    expect(workflow).toContain("bun run release:publish");
    expect(workflow).toContain("[skip ci]");
    expect(workflow).toContain("git push origin main");
    expect(workflow).toContain('git push origin "v${version}"');
    expect(workflow).toContain('gh release create "$tag"');

    // No two-mode routing — no staging PR dance
    expect(workflow).not.toContain("mode=publish");
    expect(workflow).not.toContain("mode=prepare");
    expect(workflow).not.toContain("release/next");
    expect(workflow).not.toContain("gh pr create");
    expect(workflow).not.toContain("gh pr edit");
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
