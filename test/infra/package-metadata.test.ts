import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("package metadata", () => {
  it("is publishable to npm with semantic-release automation, commitlint, and husky tooling", async () => {
    const packageJsonPath = path.resolve("package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      name: string;
      private?: boolean;
      bin?: Record<string, string>;
      files?: string[];
      publishConfig?: Record<string, string>;
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
      registry: "https://registry.npmjs.org"
    });
    expect(packageJson.devDependencies?.["semantic-release"]).toBeDefined();
    expect(packageJson.devDependencies?.["@semantic-release/npm"]).toBeDefined();
    expect(packageJson.devDependencies?.["@semantic-release/github"]).toBeDefined();
    expect(packageJson.devDependencies?.["@commitlint/cli"]).toBeDefined();
    expect(packageJson.devDependencies?.["@commitlint/config-conventional"]).toBeDefined();
    expect(packageJson.devDependencies?.husky).toBeDefined();
    expect(packageJson.scripts?.release).toBe("semantic-release");
    expect(packageJson.scripts?.commitlint).toBe("commitlint --from HEAD~1 --to HEAD");
    expect(packageJson.scripts?.prepare).toBe("husky");
    expect(packageJson.scripts?.["version-packages"]).toBeUndefined();
  });
});
