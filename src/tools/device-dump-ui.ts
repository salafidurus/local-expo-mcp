import { errorResult, okResult } from "../mcp/responses.js";
import { createError, errorMessage } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";

export function createDeviceDumpUiHandler(context: AppContext) {
  return async function deviceDumpUi(input: { deviceId?: string }) {
    if (!context.integrations.mobileMcp?.dumpUi) {
      return errorResult(
        createError("MOBILE_MCP_NOT_ATTACHED", "UI dump is unavailable without hidden mobile-mcp", {
          deviceId: input.deviceId
        })
      );
    }

    try {
      const result = await context.integrations.mobileMcp.dumpUi(input);

      return okResult({
        raw: result.raw,
        nodes: result.nodes,
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
