import { okResult } from "../mcp/responses.js";
import type { AppContext } from "../app-context.js";
import { normalizeProjectRoot } from "../utils/paths.js";

export function createMetroStatusHandler(context: AppContext) {
  return async function metroStatus(input: { projectRoot: string }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);
    const metro = context.sessionStore.get(projectRoot)?.metro;

    if (!metro) {
      return okResult({ running: false });
    }

    return okResult({
      running: true,
      pid: metro.pid,
      port: metro.port,
      devServerUrl: metro.devServerUrl,
      uptimeMs: context.clock() - metro.startedAt
    });
  };
}

