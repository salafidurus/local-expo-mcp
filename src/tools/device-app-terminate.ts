import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceAppTerminateHandler(context: AppContext) {
  return async function deviceAppTerminate(input: { appId: string; deviceId?: string }) {
    if (!context.integrations.mobileMcp?.terminateApp) {
      return errorResult(
        createError("MOBILE_MCP_NOT_ATTACHED", "App termination is unavailable without hidden mobile-mcp", {
          appId: input.appId,
          deviceId: input.deviceId
        })
      );
    }

    try {
      const result = await context.integrations.mobileMcp.terminateApp(input);

      return okResult({
        ...result,
        source: "mobile-mcp"
      });
    } catch (error) {
      return errorResult(
        createError("MOBILE_MCP_COMMAND_FAILED", errorMessage(error), {
          appId: input.appId,
          deviceId: input.deviceId
        })
      );
    }
  };
}
