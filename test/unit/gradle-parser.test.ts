import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseGradleFailure } from "../../src/parsers/gradle-parser.js";

describe("parseGradleFailure", () => {
  const fixture = readFileSync(
    path.resolve("test/fixtures/logs/gradle-failure.txt"),
    "utf8"
  );

  it("classifies dependency resolution failures", () => {
    expect(parseGradleFailure(fixture)).toEqual({
      type: "dependency_resolution",
      summary: "Could not resolve com.facebook.react:react-android:0.76.0",
      suggestedFixes: [
        "Verify Maven repository configuration",
        "Check dependency coordinates and version alignment",
        "Re-run after refreshing Gradle dependencies if configuration is correct"
      ]
    });
  });

  it("returns undefined when no known Gradle failure pattern is found", () => {
    expect(parseGradleFailure("BUILD SUCCESSFUL")).toBeUndefined();
  });
});
