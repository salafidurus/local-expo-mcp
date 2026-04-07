import { okResult } from "../mcp/responses.js";
import type { AppContext } from "../app-context.js";
import { findAvailableTcpPort, isTcpPortAvailable } from "../utils/ports.js";
import { normalizeProjectRoot } from "../utils/paths.js";

export function createMetroStartHandler(context: AppContext) {
  return async function metroStart(input: {
    projectRoot: string;
    port?: number;
    clear?: boolean;
  }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);
    const ownerKey = `project:${projectRoot}`;
    const sessionId = `metro:${projectRoot}`;

    return await context.locks.withLock(`metro:${projectRoot}`, async () => {
      const existing = context.sessionStore.get(projectRoot)?.metro;
      if (existing) {
        return okResult({
          sessionId,
          pid: existing.pid,
          port: existing.port,
          devServerUrl: existing.devServerUrl
        });
      }

      const selectedPort = await resolveMetroPort(input.port);
      const controller = await context.integrations.expoCli.startMetro({
        projectRoot,
        port: selectedPort,
        clear: input.clear,
        onLogLine: (entry) => {
          context.logStore.append(`metro:${projectRoot}`, entry);
        }
      });

      context.runtime.metroControllers.set(projectRoot, controller);
      context.processStore.upsert({
        name: "metro",
        ownerKey,
        pid: controller.pid,
        cwd: projectRoot,
        startedAt: context.clock(),
        status: "running",
        command: "expo",
        args: ["start"]
      });
      context.sessionStore.merge(projectRoot, {
        projectType: "expo",
        metro: {
          pid: controller.pid,
          port: controller.port,
          devServerUrl: controller.devServerUrl,
          startedAt: context.clock()
        }
      });

      return okResult({
        sessionId,
        pid: controller.pid,
        port: controller.port,
        devServerUrl: controller.devServerUrl
      });
    });
  };
}

async function resolveMetroPort(requestedPort?: number): Promise<number> {
  if (requestedPort === undefined) {
    return await findAvailableTcpPort();
  }

  const available = await isTcpPortAvailable(requestedPort);
  if (available) {
    return requestedPort;
  }

  return await findAvailableTcpPort();
}

