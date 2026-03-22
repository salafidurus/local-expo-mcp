import { describe, expect, it } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createMetroRestartHandler } from "../../src/tools/metro-restart.js";
import { createMetroStartHandler } from "../../src/tools/metro-start.js";
import { createMetroStatusHandler } from "../../src/tools/metro-status.js";

function createRestartableExpoCli() {
  let nextPid = 14560;
  let stopCount = 0;

  return {
    metrics: {
      get stopCount() {
        return stopCount;
      }
    },
    integration: {
      async startMetro(input: {
        port: number;
        onLogLine?: (entry: { level: "info" | "warn" | "error"; text: string; at: number }) => void;
      }) {
        const pid = nextPid++;
        input.onLogLine?.({ level: "info", text: `Metro waiting on http://127.0.0.1:${input.port}`, at: pid });

        return {
          pid,
          port: input.port,
          devServerUrl: `http://127.0.0.1:${input.port}`,
          async stop() {
            stopCount += 1;
          }
        };
      }
    }
  };
}

describe("metro restart", () => {
  it("stops the current Metro instance and starts a fresh one", async () => {
    const fakeExpoCli = createRestartableExpoCli();
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: fakeExpoCli.integration
      }
    });

    const startMetro = createMetroStartHandler(context);
    const restartMetro = createMetroRestartHandler(context);
    const metroStatus = createMetroStatusHandler(context);

    await startMetro({ projectRoot: "C:/dev/app", port: 8081 });
    const restarted = await restartMetro({ projectRoot: "C:/dev/app", port: 8081, clear: true });

    expect(fakeExpoCli.metrics.stopCount).toBe(1);
    expect(restarted).toEqual({
      ok: true,
      sessionId: "metro:C:/dev/app",
      pid: 14561,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081"
    });
    expect(await metroStatus({ projectRoot: "C:/dev/app" })).toEqual({
      ok: true,
      running: true,
      pid: 14561,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081",
      uptimeMs: 0
    });
  });

  it("starts Metro if restart is requested while Metro is not running", async () => {
    const fakeExpoCli = createRestartableExpoCli();
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: fakeExpoCli.integration
      }
    });

    const restartMetro = createMetroRestartHandler(context);

    const restarted = await restartMetro({ projectRoot: "C:/dev/app", port: 8081 });

    expect(fakeExpoCli.metrics.stopCount).toBe(0);
    expect(restarted).toEqual({
      ok: true,
      sessionId: "metro:C:/dev/app",
      pid: 14560,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081"
    });
  });
});
