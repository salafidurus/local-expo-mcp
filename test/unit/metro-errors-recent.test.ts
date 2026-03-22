import { describe, expect, it } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createMetroErrorsRecentHandler } from "../../src/tools/metro-errors-recent.js";

describe("metro_errors_recent", () => {
  it("parses, deduplicates, and limits recent Metro errors", async () => {
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        }
      }
    });

    context.logStore.append("metro:C:/dev/app", {
      level: "error",
      text: "Unable to resolve module ./foo from C:/dev/app/src/App.tsx",
      at: 1
    });
    context.logStore.append("metro:C:/dev/app", {
      level: "error",
      text: "Unable to resolve module ./foo from C:/dev/app/src/App.tsx",
      at: 2
    });
    context.logStore.append("metro:C:/dev/app", {
      level: "error",
      text: "SyntaxError: C:/dev/app/src/broken.tsx: Unexpected token, expected \",\" (7:14)",
      at: 3
    });

    const metroErrorsRecent = createMetroErrorsRecentHandler(context);

    expect(await metroErrorsRecent({ projectRoot: "C:/dev/app", limit: 10 })).toEqual({
      ok: true,
      errors: [
        {
          type: "module_resolution",
          file: "C:/dev/app/src/App.tsx",
          message: "Unable to resolve module ./foo",
          suggestedFixes: [
            "Check that the target file exists at the expected path.",
            "Check import path casing and relative path segments.",
            "Check whether the import relies on an extension or platform-specific file that does not exist."
          ]
        },
        {
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
        }
      ]
    });
  });
});
