import { okResult } from "../mcp/responses.js";
import type { AppContext } from "../app-context.js";

export function createDeviceListHandler(context: AppContext) {
  return async function deviceList(_: Record<string, never>) {
    try {
      const mobileDevices = await context.integrations.mobileMcp?.listDevices?.();
      if (mobileDevices && mobileDevices.length > 0) {
        context.runtime.latestDeviceInfo = mobileDevices;
        return okResult({
          devices: mobileDevices
        });
      }
    } catch {
      // Fall back to adb when the richer hidden mobile client is stale or unavailable.
    }

    const devices = (await context.integrations.adb?.listDevices()) ?? [];
    const enriched = devices.map((device) => ({
      ...device,
      source: "adb" as const
    }));

    context.runtime.latestDeviceInfo = enriched;

    return okResult({
      devices: enriched
    });
  };
}
