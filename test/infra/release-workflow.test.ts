import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflows", () => {
  it("publishes from main pushes only when the merged PR carried the publish label", async () => {
    const workflowPath = path.resolve(".github/workflows/release.yml");
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("push:");
    expect(workflow).toContain("branches:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("pull_request_target:");
    expect(workflow).toContain("gh api");
    expect(workflow).toContain("commits/${{ github.sha }}/pulls");
    expect(workflow).toContain("publish_label=true");
    expect(workflow).toContain("steps.publish_gate.outputs.publish_label == 'true'");
    expect(workflow).toContain("bun run release");
    expect(workflow).toContain("NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}");
  });

  it("has a stale publish workflow that auto-publishes after 7 days when a release is pending", async () => {
    const workflowPath = path.resolve(".github/workflows/stale-publish.yml");
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("schedule:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("npm view local-expo-mcp time.modified");
    expect(workflow).toContain("7 * 24 * 60 * 60 * 1000");
    expect(workflow).toContain("bunx semantic-release --dry-run");
    expect(workflow).toContain("release_pending=true");
    expect(workflow).toContain("bun run release");
  });

  it("has a semantic-release config file in the repo", async () => {
    const configPath = path.resolve(".releaserc.json");
    const config = JSON.parse(await readFile(configPath, "utf8")) as {
      branches: string[];
      plugins: Array<string | [string, Record<string, unknown>]>;
    };

    expect(config.branches).toEqual(["main"]);
    expect(config.plugins.some((plugin) => Array.isArray(plugin) ? plugin[0] === "@semantic-release/npm" : plugin === "@semantic-release/npm")).toBe(true);
    expect(config.plugins.some((plugin) => Array.isArray(plugin) ? plugin[0] === "@semantic-release/github" : plugin === "@semantic-release/github")).toBe(true);
    expect(config.plugins.some((plugin) => Array.isArray(plugin) ? plugin[0] === "@semantic-release/changelog" : plugin === "@semantic-release/changelog")).toBe(true);
  });
});
