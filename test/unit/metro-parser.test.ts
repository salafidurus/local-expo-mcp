import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMetroErrorText } from "../../src/parsers/metro-parser.js";

function readFixture(name: string) {
  return readFileSync(resolve(process.cwd(), "test/fixtures/logs", name), "utf8");
}

describe("parseMetroErrorText", () => {
  it("classifies module resolution failures", () => {
    const parsed = parseMetroErrorText(readFixture("metro-module-resolution.txt"));

    expect(parsed).toEqual({
      type: "module_resolution",
      file: "C:/dev/app/src/App.tsx",
      message: "Unable to resolve module ./foo",
      suggestedFixes: [
        "Check that the target file exists at the expected path.",
        "Check import path casing and relative path segments.",
        "Check whether the import relies on an extension or platform-specific file that does not exist."
      ]
    });
  });

  it("classifies TypeScript compile failures", () => {
    const parsed = parseMetroErrorText(readFixture("metro-typescript.txt"));

    expect(parsed).toEqual({
      type: "typescript",
      file: "src/App.tsx",
      line: 14,
      column: 7,
      message: "TS2339: Property 'missing' does not exist on type '{ title: string; }'.",
      suggestedFixes: [
        "Check the reported property or symbol name against the declared TypeScript type.",
        "Update the type definition or narrow the value before using it.",
        "Run the TypeScript compiler directly if you need a fuller diagnostic trace."
      ]
    });
  });

  it("classifies Babel or syntax parse failures", () => {
    const parsed = parseMetroErrorText(readFixture("metro-babel.txt"));

    expect(parsed).toEqual({
      type: "babel_parse",
      file: "C:/dev/app/src/broken.tsx",
      line: 7,
      column: 14,
      message: "Unexpected token, expected \",\"",
      suggestedFixes: [
        "Inspect the syntax near the reported line and column.",
        "Check for unclosed JSX, parentheses, braces, or commas.",
        "If Babel syntax support is expected, verify the relevant Expo or Babel configuration."
      ]
    });
  });
});
