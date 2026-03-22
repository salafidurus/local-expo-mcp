import { okResult } from "../mcp/responses.js";
import type { AppContext } from "../app-context.js";

export function createDeviceLogsRecentHandler(context: AppContext) {
  return async function deviceLogsRecent(input: { limit?: number }) {
    try {
      const mobileLines = await context.integrations.mobileMcp?.recentLogs?.({ limit: input.limit });
      if (mobileLines) {
        return okResult({
          lines: mobileLines,
          source: "mobile-mcp"
        });
      }
    } catch {
      // Fall back to adb when the hidden mobile client becomes stale.
    }

    const lines = await context.integrations.adb?.recentLogs({ limit: input.limit });

    return okResult({
      lines: lines ?? [],
      source: "adb"
    });
  };
}
