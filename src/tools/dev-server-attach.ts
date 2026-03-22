import type { ExpoMcpAttachment } from "../app-context.js";
import { errorResult, okResult } from "../mcp/responses.js";
import { createError } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDevServerAttachHandler(context: AppContext) {
  return async function devServerAttach(input: { projectRoot: string }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);

    return await context.locks.withLock(`expo-mcp:${projectRoot}`, async () => {
      const metro = context.sessionStore.get(projectRoot)?.metro;
      if (!metro?.devServerUrl) {
        return errorResult(
          createError("METRO_URL_NOT_DETECTED", "Metro is not ready for hidden expo-mcp attach", {
            projectRoot
          })
        );
      }

      const existing = context.runtime.expoMcpAttachments.get(projectRoot);
      if (isHealthyAttachment(existing)) {
        return okResult({
          attached: true,
          provider: "expo-mcp",
          devServerUrl: metro.devServerUrl
        });
      }

      if (!context.integrations.expoMcp) {
        return errorResult(
          createError("EXPO_MCP_ATTACH_FAILED", "Hidden expo-mcp integration is unavailable", {
            projectRoot,
            devServerUrl: metro.devServerUrl
          })
        );
      }

      const attachment = await context.integrations.expoMcp.attach({
        projectRoot,
        devServerUrl: metro.devServerUrl
      });

      context.runtime.expoMcpAttachments.set(projectRoot, attachment);
      context.sessionStore.merge(projectRoot, {
        attachedExpoMcp: {
          status: attachment.status,
          startedAt: attachment.startedAt,
          pid: attachment.pid
        }
      });

      return okResult({
        attached: true,
        provider: "expo-mcp",
        devServerUrl: metro.devServerUrl
      });
    });
  };
}

function isHealthyAttachment(attachment?: ExpoMcpAttachment): attachment is ExpoMcpAttachment {
  return attachment?.status === "attached";
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}
