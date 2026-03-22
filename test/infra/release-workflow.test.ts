import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("runs only when a publish label, manual dispatch, or a pending schedule permits it", async () => {
    const workflowPath = path.resolve(".github/workflows/release.yml");
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain("push:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("schedule:");
    expect(workflow).toContain("cron: \"0 0 * * 6\"");
    expect(workflow).toContain("publish_label=true");
    expect(workflow).toContain("steps.publish_gate.outputs.publish_label");
    expect(workflow).toContain("npm view local-expo-mcp time.modified");
    expect(workflow).toContain("release_pending");
    expect(workflow).toContain("steps.release_gate.outputs.run_release == 'true'");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN:");
    expect(workflow.indexOf("Build")).toBeLessThan(workflow.indexOf("Run tests"));
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
