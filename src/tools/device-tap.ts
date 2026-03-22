import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceTapHandler(context: AppContext) {
  return async function deviceTap(input: { x: number; y: number; deviceId?: string }) {
    if (!context.integrations.mobileMcp?.tap) {
      return errorResult(
        createError("MOBILE_MCP_NOT_ATTACHED", "Tap is unavailable without hidden mobile-mcp", {
          x: input.x,
          y: input.y,
          deviceId: input.deviceId
        })
      );
    }

    try {
      const result = await context.integrations.mobileMcp.tap(input);

      return okResult({
        ...result,
        source: "mobile-mcp"
      });
    } catch (error) {
      return errorResult(
        createError("MOBILE_MCP_COMMAND_FAILED", errorMessage(error), {
          x: input.x,
          y: input.y,
          deviceId: input.deviceId
        })
      );
    }
  };
}
