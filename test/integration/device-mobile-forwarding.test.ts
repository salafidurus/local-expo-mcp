import { describe, expect, it, vi } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createDeviceAppLaunchHandler } from "../../src/tools/device-app-launch.js";
import { createDeviceAppTerminateHandler } from "../../src/tools/device-app-terminate.js";
import { createDeviceForegroundAppHandler } from "../../src/tools/device-foreground-app.js";

describe("device mobile-mcp forwarding", () => {
  it("launches an app through hidden mobile-mcp", async () => {
    const launchApp = vi.fn(async (input: { appId: string; deviceId?: string }) => ({
      appId: input.appId,
      deviceId: input.deviceId ?? "active",
      status: "launched" as const
    }));
    const context = createAppContext({
      integrations: {
        expoCli: { async startMetro() { throw new Error("not used"); } },
        mobileMcp: {
          async screenshot() { throw new Error("not used"); },
          launchApp
        }
      }
    });

    const handler = createDeviceAppLaunchHandler(context);
    const result = await handler({ appId: "com.example.app", deviceId: "emulator-5554" });

    expect(result).toEqual({
      ok: true,
      appId: "com.example.app",
      deviceId: "emulator-5554",
      status: "launched",
      source: "mobile-mcp"
    });
  });

  it("terminates an app through hidden mobile-mcp", async () => {
    const terminateApp = vi.fn(async (input: { appId: string; deviceId?: string }) => ({
      appId: input.appId,
      deviceId: input.deviceId ?? "active",
      status: "terminated" as const
    }));
    const context = createAppContext({
      integrations: {
        expoCli: { async startMetro() { throw new Error("not used"); } },
        mobileMcp: {
          async screenshot() { throw new Error("not used"); },
          terminateApp
        }
      }
    });

    const handler = createDeviceAppTerminateHandler(context);
    const result = await handler({ appId: "com.example.app" });

    expect(result).toEqual({
      ok: true,
      appId: "com.example.app",
      deviceId: "active",
      status: "terminated",
      source: "mobile-mcp"
    });
  });

  it("reads the foreground app through hidden mobile-mcp", async () => {
    const foregroundApp = vi.fn(async (input: { deviceId?: string }) => ({
      appId: "com.example.app",
      deviceId: input.deviceId ?? "active"
    }));
    const context = createAppContext({
      integrations: {
        expoCli: { async startMetro() { throw new Error("not used"); } },
        mobileMcp: {
          async screenshot() { throw new Error("not used"); },
          foregroundApp
        }
      }
    });

    const handler = createDeviceForegroundAppHandler(context);
    const result = await handler({ deviceId: "emulator-5554" });

    expect(result).toEqual({
      ok: true,
      appId: "com.example.app",
      deviceId: "emulator-5554",
      source: "mobile-mcp"
    });
  });
});
