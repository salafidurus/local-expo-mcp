import { describe, expect, it, vi } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createDeviceListHandler } from "../../src/tools/device-list.js";
import { createDeviceLogsRecentHandler } from "../../src/tools/device-logs-recent.js";

describe("device tools", () => {
  it("prefers hidden mobile MCP devices when available", async () => {
    const listDevices = vi.fn(async () => [
      { id: "pixel-9", platform: "android" as const, state: "device", source: "mobile-mcp" as const }
    ]);
    const adbListDevices = vi.fn(async () => [
      { id: "emulator-5554", platform: "android" as const, state: "device" }
    ]);
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        mobileMcp: {
          async screenshot() {
            throw new Error("not used");
          },
          listDevices
        },
        adb: {
          listDevices: adbListDevices,
          async recentLogs() {
            return [];
          }
        }
      }
    });

    const deviceList = createDeviceListHandler(context);

    expect(await deviceList({})).toEqual({
      ok: true,
      devices: [
        { id: "pixel-9", platform: "android", state: "device", source: "mobile-mcp" }
      ]
    });
    expect(listDevices).toHaveBeenCalledOnce();
    expect(adbListDevices).not.toHaveBeenCalled();
  });

  it("falls back to adb device listing when hidden mobile MCP has no device support", async () => {
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        mobileMcp: {
          async screenshot() {
            throw new Error("not used");
          }
        },
        adb: {
          async listDevices() {
            return [
              { id: "emulator-5554", platform: "android", state: "device" }
            ];
          },
          async recentLogs() {
            return [];
          }
        }
      }
    });

    const deviceList = createDeviceListHandler(context);

    expect(await deviceList({})).toEqual({
      ok: true,
      devices: [
        { id: "emulator-5554", platform: "android", state: "device", source: "adb" }
      ]
    });
  });

  it("prefers hidden mobile MCP logs when available", async () => {
    const recentLogs = vi.fn(async () => [
      { level: "info" as const, text: "mobile log line", at: 1000 }
    ]);
    const adbRecentLogs = vi.fn(async () => [
      { level: "info" as const, text: "adb log line", at: 1001 }
    ]);
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        mobileMcp: {
          async screenshot() {
            throw new Error("not used");
          },
          recentLogs
        },
        adb: {
          async listDevices() {
            return [];
          },
          recentLogs: adbRecentLogs
        }
      }
    });

    const deviceLogsRecent = createDeviceLogsRecentHandler(context);

    expect(await deviceLogsRecent({ limit: 10 })).toEqual({
      ok: true,
      lines: [
        { level: "info", text: "mobile log line", at: 1000 }
      ],
      source: "mobile-mcp"
    });
    expect(recentLogs).toHaveBeenCalledWith({ limit: 10 });
    expect(adbRecentLogs).not.toHaveBeenCalled();
  });

  it("returns recent Android logs via adb fallback", async () => {
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        adb: {
          async listDevices() {
            return [];
          },
          async recentLogs() {
            return [
              { level: "info" as const, text: "Activity resumed", at: 1000 }
            ];
          }
        }
      }
    });

    const deviceLogsRecent = createDeviceLogsRecentHandler(context);

    expect(await deviceLogsRecent({ limit: 10 })).toEqual({
      ok: true,
      lines: [
        { level: "info", text: "Activity resumed", at: 1000 }
      ],
      source: "adb"
    });
  });

  it("falls back to adb device listing when hidden mobile MCP throws", async () => {
    const adbListDevices = vi.fn(async () => [
      { id: "emulator-5554", platform: "android" as const, state: "device" }
    ]);
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        mobileMcp: {
          async screenshot() {
            throw new Error("not used");
          },
          listDevices: vi.fn(async () => {
            throw new Error("pipe closed");
          })
        },
        adb: {
          listDevices: adbListDevices,
          async recentLogs() {
            return [];
          }
        }
      }
    });

    const deviceList = createDeviceListHandler(context);

    expect(await deviceList({})).toEqual({
      ok: true,
      devices: [
        { id: "emulator-5554", platform: "android", state: "device", source: "adb" }
      ]
    });
    expect(adbListDevices).toHaveBeenCalledOnce();
  });

  it("falls back to adb logs when hidden mobile MCP throws", async () => {
    const adbRecentLogs = vi.fn(async () => [
      { level: "info" as const, text: "adb log line", at: 1001 }
    ]);
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        mobileMcp: {
          async screenshot() {
            throw new Error("not used");
          },
          recentLogs: vi.fn(async () => {
            throw new Error("pipe closed");
          })
        },
        adb: {
          async listDevices() {
            return [];
          },
          recentLogs: adbRecentLogs
        }
      }
    });

    const deviceLogsRecent = createDeviceLogsRecentHandler(context);

    expect(await deviceLogsRecent({ limit: 10 })).toEqual({
      ok: true,
      lines: [
        { level: "info", text: "adb log line", at: 1001 }
      ],
      source: "adb"
    });
    expect(adbRecentLogs).toHaveBeenCalledWith({ limit: 10 });
  });

});
