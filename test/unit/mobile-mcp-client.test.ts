import { describe, expect, it, vi } from "vitest";
import { createMobileMcpIntegration } from "../../src/integrations/mobile-mcp-client.js";

describe("createMobileMcpIntegration", () => {
  it("initializes the hidden mobile-mcp client and persists screenshot output", async () => {
    const connect = vi.fn(async () => undefined);
    const callTool = vi
      .fn()
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "Successfully initialized mobile devices." }]
      })
      .mockResolvedValueOnce({
        content: [
          { type: "text", text: "Screenshot captured" },
          {
            type: "image",
            mimeType: "image/png",
            data: "aGVsbG8="
          }
        ]
      });

    const createClient = vi.fn(() => ({ connect, callTool }));
    const createTransport = vi.fn(() => ({ pid: 9876 }));
    const mkdir = vi.fn(async () => undefined);
    const writeFile = vi.fn(async () => undefined);

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient,
      createTransport,
      nodeCommand: "node",
      outputDir: "C:/tmp/screenshots",
      mkdir,
      writeFile,
      randomId: () => "shot-1"
    });

    const result = await integration.screenshot({});

    expect(createTransport).toHaveBeenCalledWith({
      command: "node",
      args: ["C:/deps/mobile-mcp/dist/index.js"],
      cwd: process.cwd(),
      stderr: "pipe"
    });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(callTool).toHaveBeenNthCalledWith(1, {
      name: "mobile_init",
      arguments: {}
    });
    expect(callTool).toHaveBeenNthCalledWith(2, {
      name: "mobile_screenshot",
      arguments: {}
    });
    expect(mkdir).toHaveBeenCalledWith("C:/tmp/screenshots", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      "C:/tmp/screenshots/shot-1.png",
      Buffer.from("aGVsbG8=", "base64")
    );
    expect(result).toEqual({
      path: "C:/tmp/screenshots/shot-1.png"
    });
  });

  it("reuses the connected client for repeated screenshots", async () => {
    const connect = vi.fn(async () => undefined);
    const callTool = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: "init" }] })
      .mockResolvedValueOnce({
        content: [{ type: "image", mimeType: "image/png", data: "aGVsbG8=" }]
      })
      .mockResolvedValueOnce({
        content: [{ type: "image", mimeType: "image/png", data: "d29ybGQ=" }]
      });

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient: vi.fn(() => ({ connect, callTool })),
      createTransport: vi.fn(() => ({ pid: 9876 })),
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined),
      randomId: vi.fn()
        .mockReturnValueOnce("shot-1")
        .mockReturnValueOnce("shot-2")
    });

    await integration.screenshot({});
    await integration.screenshot({});

    expect(connect).toHaveBeenCalledTimes(1);
    expect(callTool).toHaveBeenCalledTimes(3);
  });

  it("closes the cached client and reconnects cleanly on the next screenshot", async () => {
    const connect = vi.fn(async () => undefined);
    const closeClient = vi.fn(async () => undefined);
    const closeTransport = vi.fn(async () => undefined);
    const callTool = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: "init" }] })
      .mockResolvedValueOnce({
        content: [{ type: "image", mimeType: "image/png", data: "aGVsbG8=" }]
      })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "init-again" }] })
      .mockResolvedValueOnce({
        content: [{ type: "image", mimeType: "image/png", data: "d29ybGQ=" }]
      });
    const createClient = vi.fn(() => ({ connect, callTool, close: closeClient }));
    const createTransport = vi.fn(() => ({ pid: 9876, close: closeTransport }));

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient,
      createTransport,
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined),
      randomId: vi.fn()
        .mockReturnValueOnce("shot-1")
        .mockReturnValueOnce("shot-2")
    });

    await integration.screenshot({});
    await integration.close?.();
    await integration.screenshot({});

    expect(closeClient).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(2);
    expect(callTool).toHaveBeenCalledTimes(4);
  });

  it("forwards device listing, logs, app launch, app terminate, and foreground app queries", async () => {
    const connect = vi.fn(async () => undefined);
    const callTool = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify([{ id: "emulator-5554", platform: "android", state: "device" }]) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify([{ level: "info", text: "hello", at: 123 }]) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify({ appId: "com.example.app", deviceId: "emulator-5554", status: "launched" }) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify({ appId: "com.example.app", deviceId: "emulator-5554", status: "terminated" }) }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify({ appId: "com.example.app", deviceId: "emulator-5554" }) }] });

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient: vi.fn(() => ({ connect, callTool })),
      createTransport: vi.fn(() => ({ pid: 9876 })),
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined)
    });

    await expect(integration.listDevices!()).resolves.toEqual([
      { id: "emulator-5554", platform: "android", state: "device", source: "mobile-mcp" }
    ]);
    await expect(integration.recentLogs!({ limit: 5 })).resolves.toEqual([
      { level: "info", text: "hello", at: 123 }
    ]);
    await expect(integration.launchApp!({ appId: "com.example.app", deviceId: "emulator-5554" })).resolves.toEqual({
      appId: "com.example.app",
      deviceId: "emulator-5554",
      status: "launched"
    });
    await expect(integration.terminateApp!({ appId: "com.example.app", deviceId: "emulator-5554" })).resolves.toEqual({
      appId: "com.example.app",
      deviceId: "emulator-5554",
      status: "terminated"
    });
    await expect(integration.foregroundApp!({ deviceId: "emulator-5554" })).resolves.toEqual({
      appId: "com.example.app",
      deviceId: "emulator-5554"
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(callTool).toHaveBeenNthCalledWith(1, {
      name: "mobile_list_devices",
      arguments: {}
    });
    expect(callTool).toHaveBeenNthCalledWith(2, {
      name: "mobile_recent_logs",
      arguments: { limit: 5 }
    });
    expect(callTool).toHaveBeenNthCalledWith(3, {
      name: "mobile_launch_app",
      arguments: { appId: "com.example.app", deviceId: "emulator-5554" }
    });
    expect(callTool).toHaveBeenNthCalledWith(4, {
      name: "mobile_terminate_app",
      arguments: { appId: "com.example.app", deviceId: "emulator-5554" }
    });
    expect(callTool).toHaveBeenNthCalledWith(5, {
      name: "mobile_foreground_app",
      arguments: { deviceId: "emulator-5554" }
    });
  });

  it("drops a stale cached client after child-process failure and reconnects on retry", async () => {
    const firstClient = {
      connect: vi.fn(async () => undefined),
      callTool: vi.fn(async () => {
        throw new Error("pipe closed");
      }),
      close: vi.fn(async () => undefined)
    };
    const secondClient = {
      connect: vi.fn(async () => undefined),
      callTool: vi.fn(async () => ({
        content: [{ type: "text", text: JSON.stringify([{ id: "emulator-5554", platform: "android", state: "device" }]) }]
      })),
      close: vi.fn(async () => undefined)
    };
    const firstTransport = { pid: 1111, close: vi.fn(async () => undefined) };
    const secondTransport = { pid: 2222, close: vi.fn(async () => undefined) };
    const createClient = vi.fn()
      .mockReturnValueOnce(firstClient)
      .mockReturnValueOnce(secondClient);
    const createTransport = vi.fn()
      .mockReturnValueOnce(firstTransport)
      .mockReturnValueOnce(secondTransport);

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient,
      createTransport,
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined)
    });

    await expect(integration.listDevices!()).rejects.toThrow("pipe closed");
    await expect(integration.listDevices!()).resolves.toEqual([
      { id: "emulator-5554", platform: "android", state: "device", source: "mobile-mcp" }
    ]);

    expect(firstClient.close).toHaveBeenCalledTimes(1);
    expect(firstTransport.close).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(2);
    expect(createTransport).toHaveBeenCalledTimes(2);
  });

});
