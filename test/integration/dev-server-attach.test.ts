import { describe, expect, it } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createMetroStartHandler } from "../../src/tools/metro-start.js";
import { createDevServerAttachHandler } from "../../src/tools/dev-server-attach.js";

function createFakeExpoCli() {
  return {
    async startMetro(input: {
      port: number;
      onLogLine?: (entry: { level: "info" | "warn" | "error"; text: string; at: number }) => void;
    }) {
      input.onLogLine?.({ level: "info", text: `Metro waiting on http://127.0.0.1:${input.port}`, at: 1000 });
      return {
        pid: 14560,
        port: input.port,
        devServerUrl: `http://127.0.0.1:${input.port}`,
        async stop() {}
      };
    }
  };
}

describe("dev_server_attach", () => {
  it("attaches hidden expo-mcp after Metro is healthy", async () => {
    const calls: string[] = [];
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: createFakeExpoCli(),
        expoMcp: {
          async attach(input: { projectRoot: string; devServerUrl: string }) {
            calls.push(`${input.projectRoot}|${input.devServerUrl}`);
            return {
              pid: 24560,
              status: "attached" as const,
              startedAt: 1000,
              async detach() {}
            };
          }
        }
      }
    });

    const startMetro = createMetroStartHandler(context);
    const attach = createDevServerAttachHandler(context);

    await startMetro({ projectRoot: "C:/dev/app", port: 8081 });
    const result = await attach({ projectRoot: "C:/dev/app" });

    expect(calls).toEqual(["C:/dev/app|http://127.0.0.1:8081"]);
    expect(result).toEqual({
      ok: true,
      attached: true,
      provider: "expo-mcp",
      devServerUrl: "http://127.0.0.1:8081"
    });
  });

  it("returns a typed failure when Metro has no dev-server URL", async () => {
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: createFakeExpoCli(),
        expoMcp: {
          async attach() {
            throw new Error("should not be called");
          }
        }
      }
    });

    const attach = createDevServerAttachHandler(context);

    const result = await attach({ projectRoot: "C:/dev/app" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "METRO_URL_NOT_DETECTED",
        message: "Metro is not ready for hidden expo-mcp attach",
        details: {
          projectRoot: "C:/dev/app"
        }
      }
    });
  });

  it("reuses an existing healthy hidden expo-mcp attachment", async () => {
    let attachCount = 0;
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: createFakeExpoCli(),
        expoMcp: {
          async attach() {
            attachCount += 1;
            return {
              pid: 24560,
              status: "attached" as const,
              startedAt: 1000,
              async detach() {}
            };
          }
        }
      }
    });

    const startMetro = createMetroStartHandler(context);
    const attach = createDevServerAttachHandler(context);

    await startMetro({ projectRoot: "C:/dev/app", port: 8081 });
    await attach({ projectRoot: "C:/dev/app" });
    const second = await attach({ projectRoot: "C:/dev/app" });

    expect(attachCount).toBe(1);
    expect(second).toEqual({
      ok: true,
      attached: true,
      provider: "expo-mcp",
      devServerUrl: "http://127.0.0.1:8081"
    });
  });
});
