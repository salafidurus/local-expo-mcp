import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceKeyPressHandler(context: AppContext) {
  return async function deviceKeyPress(input: { key: string; deviceId?: string }) {
    if (!context.integrations.mobileMcp?.keyPress) {
      return errorResult(
        createError("MOBILE_MCP_NOT_ATTACHED", "Key press is unavailable without hidden mobile-mcp", {
          key: input.key,
          deviceId: input.deviceId
        })
      );
    }

    try {
      const result = await context.integrations.mobileMcp.keyPress(input);

      return okResult({
        ...result,
        source: "mobile-mcp"
      });
    } catch (error) {
      return errorResult(
        createError("MOBILE_MCP_COMMAND_FAILED", errorMessage(error), {
          key: input.key,
          deviceId: input.deviceId
        })
      );
    }
  };
}
