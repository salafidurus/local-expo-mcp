import { okResult } from "../mcp/responses.js";
import type { AppContext } from "../app-context.js";

export function createMetroStopHandler(context: AppContext) {
  return async function metroStop(input: { projectRoot: string }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);
    const ownerKey = `project:${projectRoot}`;

    return await context.locks.withLock(`metro:${projectRoot}`, async () => {
      const controller = context.runtime.metroControllers.get(projectRoot);
      const attachment = context.runtime.expoMcpAttachments.get(projectRoot);

      if (!controller) {
        if (attachment) {
          await attachment.detach();
          context.runtime.expoMcpAttachments.delete(projectRoot);
          context.sessionStore.merge(projectRoot, {
            attachedExpoMcp: undefined
          });
        }

        return okResult({
          stopped: false,
          projectRoot
        });
      }

      await controller.stop();
      context.runtime.metroControllers.delete(projectRoot);
      context.processStore.updateStatus("metro", ownerKey, "stopped", context.clock());

      if (attachment) {
        await attachment.detach();
        context.runtime.expoMcpAttachments.delete(projectRoot);
      }

      context.sessionStore.merge(projectRoot, {
        metro: undefined,
        attachedExpoMcp: undefined
      });

      return okResult({
        stopped: true,
        projectRoot
      });
    });
  };
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}
