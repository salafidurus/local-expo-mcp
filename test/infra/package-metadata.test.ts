import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("package metadata", () => {
  it("is publishable to npm with release-pr automation, commitlint, and husky tooling", async () => {
    const packageJsonPath = path.resolve("package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      name: string;
      private?: boolean;
      bin?: Record<string, string>;
      files?: string[];
      publishConfig?: Record<string, string | boolean>;
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.name).toBe("local-expo-mcp");
    expect(packageJson.private).toBe(false);
    expect(packageJson.bin).toEqual({
      "local-expo-mcp": "./dist/server.js"
    });
    expect(packageJson.files).toContain("dist");
    expect(packageJson.publishConfig).toEqual({
      access: "public",
      registry: "https://registry.npmjs.org",
      provenance: true
    });
    expect(packageJson.devDependencies?.["semantic-release"]).toBeUndefined();
    expect(packageJson.devDependencies?.["@semantic-release/npm"]).toBeUndefined();
    expect(packageJson.devDependencies?.["@semantic-release/github"]).toBeUndefined();
    expect(packageJson.devDependencies?.["@semantic-release/git"]).toBeUndefined();
    expect(packageJson.devDependencies?.["@commitlint/cli"]).toBeDefined();
    expect(packageJson.devDependencies?.["@commitlint/config-conventional"]).toBeDefined();
    expect(packageJson.devDependencies?.husky).toBeDefined();
    expect(packageJson.scripts?.["release:prepare-pr"]).toBe("tsx scripts/create-release-pr.ts");
    expect(packageJson.scripts?.["release:publish"]).toBe("npm publish --provenance --access public");
    expect(packageJson.scripts?.release).toBeUndefined();
    expect(packageJson.scripts?.commitlint).toBe("commitlint --from HEAD~1 --to HEAD");
    expect(packageJson.scripts?.prepare).toBe("husky");
  });
});
