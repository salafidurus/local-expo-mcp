import { okResult } from "../mcp/responses.js";
import type { AppContext } from "../app-context.js";
import { normalizeProjectRoot } from "../utils/paths.js";

export function createMetroLogsRecentHandler(context: AppContext) {
  return async function metroLogsRecent(input: { projectRoot: string; limit?: number }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);

    return okResult({
      lines: context.logStore.recent(`metro:${projectRoot}`, input.limit)
    });
  };
}

