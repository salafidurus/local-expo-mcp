import { describe, expect, it } from "vitest";
import path from "node:path";
import { inspectProject } from "../../src/tools/project-inspect.js";

describe("project_inspect", () => {
  const fixturesRoot = path.resolve("test/fixtures");

  it("detects an Expo project and recommends starting Metro", async () => {
    const result = await inspectProject({
      projectRoot: path.join(fixturesRoot, "expo-project-basic")
    });

    expect(result).toMatchObject({
      ok: true,
      projectType: "expo",
      packageManager: "npm",
      expoConfig: "app.json",
      hasAndroid: false,
      hasIos: false,
      recommendedNextStep: "metro_start"
    });
  });

  it("treats a broken Expo fixture as an Expo project when the project shape is valid", async () => {
    const result = await inspectProject({
      projectRoot: path.join(fixturesRoot, "expo-project-failing-module")
    });

    expect(result).toMatchObject({
      ok: true,
      projectType: "expo",
      packageManager: "npm",
      expoConfig: "app.json",
      hasAndroid: false,
      hasIos: false,
      recommendedNextStep: "metro_start"
    });
  });

  it("returns a typed failure for a non-Expo project", async () => {
    const result = await inspectProject({
      projectRoot: path.join(fixturesRoot, "non-expo-project")
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "PROJECT_NOT_EXPO",
        message: "Project root does not appear to be an Expo project",
        details: {
          projectRoot: path.join(fixturesRoot, "non-expo-project").replace(/\\/g, "/")
        }
      }
    });
  });
});
