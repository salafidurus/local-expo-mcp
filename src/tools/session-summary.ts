import { okResult } from "../mcp/responses.js";
import type { AppContext } from "../app-context.js";
import { normalizeProjectRoot } from "../utils/paths.js";

export function createSessionSummaryHandler(context: AppContext) {
  return async function sessionSummary(input: { projectRoot: string }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);
    const session = context.sessionStore.get(projectRoot) ?? { projectRoot };
    const metro = session.metro;
    const recentMetroErrors = context.logStore
      .recent(`metro:${projectRoot}`, 50)
      .filter((entry) => entry.level === "error");

    return okResult({
      projectRoot,
      projectType: session.projectType,
      packageManager: undefined,
      metro: metro
        ? {
            running: true,
            pid: metro.pid,
            port: metro.port,
            devServerUrl: metro.devServerUrl,
            startedAt: metro.startedAt,
            uptimeMs: context.clock() - metro.startedAt
          }
        : {
            running: false
          },
      ...(session.attachedExpoMcp ? { attachedExpoMcp: session.attachedExpoMcp } : {}),
      ...(session.lastAndroidRun ? { lastAndroidRun: session.lastAndroidRun } : {}),
      recentMetroErrors,
      recentDeviceInfo: context.runtime.latestDeviceInfo
    });
  };
}

