import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceScreenshotHandler(context: AppContext) {
  return async function deviceScreenshot(input: { deviceId?: string }) {
    if (!context.integrations.mobileMcp) {
      return errorResult(
        createError(
          "ANDROID_SCREENSHOT_UNSUPPORTED",
          "Device screenshot is unavailable without hidden mobile-mcp",
          {
            deviceId: input.deviceId
          }
        )
      );
    }

    try {
      const result = await context.integrations.mobileMcp.screenshot({
        deviceId: input.deviceId
      });

      return okResult({
        path: result.path,
        source: "mobile-mcp"
      });
    } catch (error) {
      return errorResult(
        createError("MOBILE_MCP_COMMAND_FAILED", errorMessage(error), {
          deviceId: input.deviceId
        })
      );
    }
  };
}
