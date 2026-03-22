import { describe, expect, it, vi } from "vitest";
import { createServer, executeToolHandler, startServer } from "../../src/server.js";
import { createAppContext } from "../../src/app-context.js";

describe("createServer", () => {
  it("uses the provided context and exposes the registered public tools on the MCP server", async () => {
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        }
      }
    });

    const created = await createServer({ context });
    const internal = created.server as unknown as { _registeredTools?: Record<string, { inputSchema?: { safeParse: (value: unknown) => { success: boolean } } }> };

    expect(created.context).toBe(context);
    expect(Object.keys(internal._registeredTools ?? {}).sort()).toEqual([
      "android_run",
      "dev_server_attach",
      "device_app_launch",
      "device_app_terminate",
      "device_foreground_app",
      "device_list",
      "device_logs_recent",
      "device_screenshot",
      "metro_errors_recent",
      "metro_logs_recent",
      "metro_restart",
      "metro_start",
      "metro_status",
      "metro_stop",
      "project_inspect",
      "session_summary"
    ]);
    expect(internal._registeredTools?.project_inspect?.inputSchema?.safeParse({}).success).toBe(false);
    expect(internal._registeredTools?.project_inspect?.inputSchema?.safeParse({ projectRoot: "C:/dev/app" }).success).toBe(true);
    expect(internal._registeredTools?.device_list?.inputSchema?.safeParse({}).success).toBe(true);
    expect(internal._registeredTools?.device_list?.inputSchema?.safeParse({ unexpected: true }).success).toBe(false);
  });

  it("normalizes unexpected tool failures into the standard error envelope", async () => {
    const result = await executeToolHandler(async () => {
      throw new Error("child pipe closed");
    }, {});

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ok: false,
            error: {
              code: "INTERNAL_TOOL_ERROR",
              message: "child pipe closed"
            }
          }, null, 2)
        }
      ],
      structuredContent: {
        ok: false,
        error: {
          code: "INTERNAL_TOOL_ERROR",
          message: "child pipe closed"
        }
      },
      isError: true
    });
  });
});

describe("startServer", () => {
  it("connects transport and disposes context on shutdown signals", async () => {
    const stopMetro = vi.fn(async () => undefined);
    const disconnect = vi.fn(async ({ server, context }: { server: { close?: () => Promise<void> }; context: ReturnType<typeof createAppContext> }) => {
      await server.close?.();
      await context.runtime.metroControllers.get("C:/dev/app")?.stop();
      context.runtime.metroControllers.clear();
    });
    const transport = {};
    const signalHandlers = new Map<string, () => void | Promise<void>>();
    const processLike = {
      once: vi.fn((signal: string, handler: () => void | Promise<void>) => {
        signalHandlers.set(signal, handler);
        return processLike;
      }),
      exitCode: undefined as number | undefined
    };
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        }
      }
    });
    context.runtime.metroControllers.set("C:/dev/app", {
      pid: 1111,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081",
      stop: stopMetro
    });

    const server = {
      connect: vi.fn(async (_transport: unknown) => undefined),
      close: vi.fn(async () => undefined)
    };

    const started = await startServer({
      context,
      transport,
      processLike,
      createServer: vi.fn(async () => ({ server, context })),
      disconnect
    });

    expect(server.connect).toHaveBeenCalledWith(transport);
    expect(processLike.once).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    expect(processLike.once).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(started.context).toBe(context);

    await signalHandlers.get("SIGINT")?.();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(stopMetro).toHaveBeenCalledTimes(1);
    expect(context.runtime.metroControllers.size).toBe(0);
  });
});
