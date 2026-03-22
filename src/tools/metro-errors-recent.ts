import { okResult } from "../mcp/responses.js";
import { parseMetroErrorText } from "../parsers/metro-parser.js";
import type { AppContext } from "../app-context.js";

export function createMetroErrorsRecentHandler(context: AppContext) {
  return async function metroErrorsRecent(input: { projectRoot: string; limit?: number }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);
    const seen = new Set<string>();
    const errors = context.logStore
      .recent(`metro:${projectRoot}`, input.limit)
      .filter((entry) => entry.level === "error")
      .map((entry) => parseMetroErrorText(entry.text))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .filter((entry) => {
        const key = JSON.stringify(entry);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

    return okResult({ errors });
  };
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}
