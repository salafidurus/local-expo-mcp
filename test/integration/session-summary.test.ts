import { describe, expect, it } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createMetroStartHandler } from "../../src/tools/metro-start.js";
import { createDevServerAttachHandler } from "../../src/tools/dev-server-attach.js";
import { createAndroidRunHandler } from "../../src/tools/android-run.js";
import { createDeviceListHandler } from "../../src/tools/device-list.js";
import { createSessionSummaryHandler } from "../../src/tools/session-summary.js";

describe("session_summary", () => {
  it("aggregates current project, Metro, child MCP, Android run, and device state", async () => {
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: {
          async startMetro(input: {
            port: number;
            onLogLine?: (entry: { level: "info" | "warn" | "error"; text: string; at: number }) => void;
          }) {
            input.onLogLine?.({ level: "error", text: "Unable to resolve module ./foo", at: 1002 });
            input.onLogLine?.({ level: "info", text: `Metro waiting on http://127.0.0.1:${input.port}`, at: 1003 });
            return {
              pid: 14560,
              port: input.port,
              devServerUrl: `http://127.0.0.1:${input.port}`,
              async stop() {}
            };
          }
        },
        expoMcp: {
          async attach() {
            return {
              pid: 24560,
              status: "attached" as const,
              startedAt: 1000,
              async detach() {}
            };
          }
        },
        androidExpoCli: {
          async runAndroid() {
            return {
              ok: false as const,
              phase: "gradle_build",
              output: "Could not resolve com.facebook.react:react-android:0.76.0."
            };
          }
        },
        adb: {
          async listDevices() {
            return [
              { id: "emulator-5554", platform: "android" as const, state: "device" }
            ];
          },
          async recentLogs() {
            return [];
          }
        }
      }
    });

    const metroStart = createMetroStartHandler(context);
    const attach = createDevServerAttachHandler(context);
    const androidRun = createAndroidRunHandler(context);
    const deviceList = createDeviceListHandler(context);
    const sessionSummary = createSessionSummaryHandler(context);

    await metroStart({ projectRoot: "C:/dev/app", port: 8081 });
    await attach({ projectRoot: "C:/dev/app" });
    await androidRun({ projectRoot: "C:/dev/app" });
    await deviceList({});

    expect(await sessionSummary({ projectRoot: "C:/dev/app" })).toEqual({
      ok: true,
      projectRoot: "C:/dev/app",
      projectType: "expo",
      packageManager: undefined,
      metro: {
        running: true,
        pid: 14560,
        port: 8081,
        devServerUrl: "http://127.0.0.1:8081",
        startedAt: 1000,
        uptimeMs: 0
      },
      attachedExpoMcp: {
        status: "attached",
        pid: 24560,
        startedAt: 1000
      },
      lastAndroidRun: {
        status: "failed",
        startedAt: 1000,
        phase: "gradle_build",
        summary: "Could not resolve com.facebook.react:react-android:0.76.0"
      },
      recentMetroErrors: [
        {
          level: "error",
          text: "Unable to resolve module ./foo",
          at: 1002
        }
      ],
      recentDeviceInfo: [
        {
          id: "emulator-5554",
          platform: "android",
          state: "device",
          source: "adb"
        }
      ]
    });
  });
});
