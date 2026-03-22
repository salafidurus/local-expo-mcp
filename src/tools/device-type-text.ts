import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceTypeTextHandler(context: AppContext) {
  return async function deviceTypeText(input: { text: string; deviceId?: string }) {
    if (!context.integrations.mobileMcp?.typeText) {
      return errorResult(
        createError("MOBILE_MCP_NOT_ATTACHED", "Text entry is unavailable without hidden mobile-mcp", {
          text: input.text,
          deviceId: input.deviceId
        })
      );
    }

    try {
      const result = await context.integrations.mobileMcp.typeText(input);

      return okResult({
        ...result,
        source: "mobile-mcp"
      });
    } catch (error) {
      return errorResult(
        createError("MOBILE_MCP_COMMAND_FAILED", errorMessage(error), {
          text: input.text,
          deviceId: input.deviceId
        })
      );
    }
  };
}
