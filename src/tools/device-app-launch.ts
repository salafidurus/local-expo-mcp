import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceAppLaunchHandler(context: AppContext) {
  return async function deviceAppLaunch(input: { appId: string; deviceId?: string }) {
    if (!context.integrations.mobileMcp?.launchApp) {
      return errorResult(
        createError("MOBILE_MCP_NOT_ATTACHED", "App launch is unavailable without hidden mobile-mcp", {
          appId: input.appId,
          deviceId: input.deviceId
        })
      );
    }

    try {
      const result = await context.integrations.mobileMcp.launchApp(input);

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
