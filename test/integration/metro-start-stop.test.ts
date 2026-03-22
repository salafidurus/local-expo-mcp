import { createServer } from "node:net";
import { describe, expect, it, vi } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createMetroStartHandler } from "../../src/tools/metro-start.js";
import { createMetroStopHandler } from "../../src/tools/metro-stop.js";
import { createMetroStatusHandler } from "../../src/tools/metro-status.js";
import { createMetroLogsRecentHandler } from "../../src/tools/metro-logs-recent.js";

function createFakeExpoCli() {
  let stopped = false;

  return {
    wasStopped: () => stopped,
    integration: {
      async startMetro(input: {
        projectRoot: string;
        port: number;
        clear?: boolean;
        onLogLine?: (entry: { level: "info" | "warn" | "error"; text: string; at: number }) => void;
      }) {
        input.onLogLine?.({ level: "info", text: "Starting Metro Bundler", at: 1000 });
        input.onLogLine?.({ level: "info", text: `Metro waiting on http://127.0.0.1:${input.port}`, at: 1001 });

        return {
          pid: 14560,
          port: input.port,
          devServerUrl: `http://127.0.0.1:${input.port}`,
          async stop() {
            stopped = true;
          }
        };
      }
    }
  };
}

async function listenOnRandomPort(): Promise<{ port: number; close: () => Promise<void> }> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not resolve busy test port"));
        return;
      }

      resolve({
        port: address.port,
        close: () => new Promise<void>((closeResolve, closeReject) => {
          server.close((error) => {
            if (error) {
              closeReject(error);
              return;
            }
            closeResolve();
          });
        })
      });
    });
    server.on("error", reject);
  });
}

describe("metro lifecycle", () => {
  it("starts Metro and stores process, session, and recent logs", async () => {
    const fakeExpoCli = createFakeExpoCli();
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: fakeExpoCli.integration
      }
    });

    const startMetro = createMetroStartHandler(context);
    const metroStatus = createMetroStatusHandler(context);
    const metroLogsRecent = createMetroLogsRecentHandler(context);

    const startResult = await startMetro({
      projectRoot: "C:/dev/app",
      port: 8081,
      clear: true
    });

    expect(startResult).toEqual({
      ok: true,
      sessionId: "metro:C:/dev/app",
      pid: 14560,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081"
    });

    expect(await metroStatus({ projectRoot: "C:/dev/app" })).toEqual({
      ok: true,
      running: true,
      pid: 14560,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081",
      uptimeMs: 0
    });

    expect(await metroLogsRecent({ projectRoot: "C:/dev/app", limit: 2 })).toEqual({
      ok: true,
      lines: [
        { level: "info", text: "Starting Metro Bundler", at: 1000 },
        { level: "info", text: "Metro waiting on http://127.0.0.1:8081", at: 1001 }
      ]
    });
  });

  it("reuses the running Metro instance even if a different port is requested later", async () => {
    let startCount = 0;
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: {
          async startMetro(input: {
            port: number;
            onLogLine?: (entry: { level: "info" | "warn" | "error"; text: string; at: number }) => void;
          }) {
            startCount += 1;
            input.onLogLine?.({ level: "info", text: `Metro waiting on http://127.0.0.1:${input.port}`, at: 1000 });
            return {
              pid: 14560,
              port: input.port,
              devServerUrl: `http://127.0.0.1:${input.port}`,
              async stop() {}
            };
          }
        }
      }
    });

    const startMetro = createMetroStartHandler(context);

    await startMetro({ projectRoot: "C:/dev/app", port: 8081 });
    const second = await startMetro({ projectRoot: "C:/dev/app", port: 9090 });

    expect(startCount).toBe(1);
    expect(second).toEqual({
      ok: true,
      sessionId: "metro:C:/dev/app",
      pid: 14560,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081"
    });
  });

  it("selects an open port when the requested port is already occupied", async () => {
    const fakeExpoCli = createFakeExpoCli();
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: fakeExpoCli.integration
      }
    });
    const busy = await listenOnRandomPort();

    try {
      const startMetro = createMetroStartHandler(context);
      const result = await startMetro({
        projectRoot: "C:/dev/app-busy",
        port: busy.port
      });

      expect(result.ok).toBe(true);
      expect(result.port).not.toBe(busy.port);
      expect(result.devServerUrl).toBe(`http://127.0.0.1:${result.port}`);
    } finally {
      await busy.close();
    }
  });

  it("selects an open port when no port is provided", async () => {
    const fakeExpoCli = createFakeExpoCli();
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: fakeExpoCli.integration
      }
    });

    const startMetro = createMetroStartHandler(context);
    const result = await startMetro({
      projectRoot: "C:/dev/app-auto"
    });

    expect(result.ok).toBe(true);
    expect(result.port).toBeGreaterThan(0);
    expect(result.devServerUrl).toBe(`http://127.0.0.1:${result.port}`);
  });

  it("stops Metro, detaches hidden expo-mcp state, and updates state", async () => {
    const fakeExpoCli = createFakeExpoCli();
    const detach = vi.fn(async () => undefined);
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: fakeExpoCli.integration
      }
    });
    context.runtime.expoMcpAttachments.set("C:/dev/app", {
      pid: 5555,
      startedAt: 1000,
      status: "attached",
      detach
    });
    context.sessionStore.merge("C:/dev/app", {
      attachedExpoMcp: {
        pid: 5555,
        startedAt: 1000,
        status: "attached"
      }
    });

    const startMetro = createMetroStartHandler(context);
    const stopMetro = createMetroStopHandler(context);
    const metroStatus = createMetroStatusHandler(context);

    await startMetro({
      projectRoot: "C:/dev/app",
      port: 8081
    });

    const stopResult = await stopMetro({ projectRoot: "C:/dev/app" });

    expect(stopResult).toEqual({
      ok: true,
      stopped: true,
      projectRoot: "C:/dev/app"
    });
    expect(fakeExpoCli.wasStopped()).toBe(true);
    expect(detach).toHaveBeenCalledOnce();
    expect(context.runtime.expoMcpAttachments.has("C:/dev/app")).toBe(false);
    expect(context.sessionStore.get("C:/dev/app")?.attachedExpoMcp).toBeUndefined();
    expect(await metroStatus({ projectRoot: "C:/dev/app" })).toEqual({
      ok: true,
      running: false
    });
  });

  it("returns existing healthy Metro session on repeated start", async () => {
    let startCount = 0;
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: {
          async startMetro(input: {
            port: number;
            onLogLine?: (entry: { level: "info" | "warn" | "error"; text: string; at: number }) => void;
          }) {
            startCount += 1;
            input.onLogLine?.({ level: "info", text: `Metro waiting on http://127.0.0.1:${input.port}`, at: 1000 });
            return {
              pid: 14560,
              port: input.port,
              devServerUrl: `http://127.0.0.1:${input.port}`,
              async stop() {}
            };
          }
        }
      }
    });

    const startMetro = createMetroStartHandler(context);

    await startMetro({ projectRoot: "C:/dev/app", port: 8081 });
    const second = await startMetro({ projectRoot: "C:/dev/app", port: 8081 });

    expect(startCount).toBe(1);
    expect(second).toEqual({
      ok: true,
      sessionId: "metro:C:/dev/app",
      pid: 14560,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081"
    });
  });
});
