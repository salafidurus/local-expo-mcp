import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceSwipeHandler(context: AppContext) {
  return async function deviceSwipe(input: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration?: number;
    deviceId?: string;
  }) {
    if (!context.integrations.mobileMcp?.swipe) {
      return errorResult(
        createError("MOBILE_MCP_NOT_ATTACHED", "Swipe is unavailable without hidden mobile-mcp", {
          startX: input.startX,
          startY: input.startY,
          endX: input.endX,
          endY: input.endY,
          duration: input.duration,
          deviceId: input.deviceId
        })
      );
    }

    try {
      const result = await context.integrations.mobileMcp.swipe(input);

      return okResult({
        ...result,
        source: "mobile-mcp"
      });
    } catch (error) {
      return errorResult(
        createError("MOBILE_MCP_COMMAND_FAILED", errorMessage(error), {
          startX: input.startX,
          startY: input.startY,
          endX: input.endX,
          endY: input.endY,
          duration: input.duration,
          deviceId: input.deviceId
        })
      );
    }
  };
}
