import { describe, expect, it } from "vitest";
import { normalizeProjectRoot, resolvePackageBin } from "../../src/utils/paths.js";

describe("normalizeProjectRoot", () => {
  it("converts backslashes to forward slashes", () => {
    expect(normalizeProjectRoot("C:\\dev\\app")).toBe("C:/dev/app");
  });

  it("strips a trailing slash", () => {
    expect(normalizeProjectRoot("C:/dev/app/")).toBe("C:/dev/app");
  });

  it("strips multiple trailing slashes", () => {
    expect(normalizeProjectRoot("C:/dev/app///")).toBe("C:/dev/app");
  });

  it("leaves a clean path unchanged", () => {
    expect(normalizeProjectRoot("C:/dev/app")).toBe("C:/dev/app");
  });
});

describe("resolvePackageBin", () => {
  it("resolves the expo-mcp bin from installed package metadata", async () => {
    const resolved = await resolvePackageBin({
      packageName: "expo-mcp",
      binName: "expo-mcp",
      cwd: process.cwd()
    });

    expect(resolved.replace(/\\/g, "/")).toMatch(/node_modules\/expo-mcp\/bin\/expo-mcp\.mjs$/);
  });

  it("uses the sole declared bin when the bin name is omitted", async () => {
    const resolved = await resolvePackageBin({
      packageName: "mobile-mcp",
      cwd: process.cwd()
    });

    expect(resolved.replace(/\\/g, "/")).toMatch(/node_modules\/mobile-mcp\/dist\/index\.js$/);
  });
});
