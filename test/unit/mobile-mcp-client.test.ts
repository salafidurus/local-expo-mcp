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

  it("initializes before listDevices, recentLogs, launchApp, terminateApp, and foregroundApp", async () => {
    const connect = vi.fn(async () => undefined);
    const callTool = vi
      .fn()
      .mockResolvedValue({ content: [{ type: "text", text: JSON.stringify([]) }] });

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient: vi.fn(() => ({ connect, callTool })),
      createTransport: vi.fn(() => ({ pid: 9876 })),
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined)
    });

    await integration.listDevices!();

    expect(callTool).toHaveBeenNthCalledWith(1, { name: "mobile_init", arguments: {} });
    expect(callTool).toHaveBeenNthCalledWith(2, { name: "mobile_list_devices", arguments: {} });
    expect(callTool).toHaveBeenCalledTimes(2);
  });

  it("forwards device listing, logs, app launch, app terminate, and foreground app queries", async () => {
    const connect = vi.fn(async () => undefined);
    const callTool = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: "init" }] })
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
      name: "mobile_init",
      arguments: {}
    });
    expect(callTool).toHaveBeenNthCalledWith(2, {
      name: "mobile_list_devices",
      arguments: {}
    });
    expect(callTool).toHaveBeenNthCalledWith(3, {
      name: "mobile_recent_logs",
      arguments: { limit: 5 }
    });
    expect(callTool).toHaveBeenNthCalledWith(4, {
      name: "mobile_launch_app",
      arguments: { appId: "com.example.app", deviceId: "emulator-5554" }
    });
    expect(callTool).toHaveBeenNthCalledWith(5, {
      name: "mobile_terminate_app",
      arguments: { appId: "com.example.app", deviceId: "emulator-5554" }
    });
    expect(callTool).toHaveBeenNthCalledWith(6, {
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

  it("forwards dump_ui, tap, swipe, type, and key press through hidden mobile-mcp", async () => {
    const connect = vi.fn(async () => undefined);
    const callTool = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: "init" }] })
      .mockResolvedValueOnce({
        content: [{
          type: "text",
          text: '<hierarchy><node text="Login" content-desc="Login button" resource-id="btn-login" class="android.widget.Button" clickable="true" enabled="true" bounds="[0,0][100,100]" /></hierarchy>'
        }]
      })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Tapped at (10, 20)" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Swiped from (0, 0) to (100, 200)" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Typed: salaam" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: "Pressed key: enter" }] });

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient: vi.fn(() => ({ connect, callTool })),
      createTransport: vi.fn(() => ({ pid: 9876 })),
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined)
    });

    await expect(integration.dumpUi?.({ deviceId: "emulator-5554" })).resolves.toEqual({
      raw: '<hierarchy><node text="Login" content-desc="Login button" resource-id="btn-login" class="android.widget.Button" clickable="true" enabled="true" bounds="[0,0][100,100]" /></hierarchy>',
      nodes: [{
        text: "Login",
        contentDescription: "Login button",
        resourceId: "btn-login",
        className: "android.widget.Button",
        clickable: true,
        enabled: true,
        bounds: "[0,0][100,100]"
      }]
    });
    await expect(integration.tap?.({ x: 10, y: 20, deviceId: "emulator-5554" })).resolves.toEqual({
      action: "tap",
      deviceId: "emulator-5554",
      message: "Tapped at (10, 20)"
    });
    await expect(integration.swipe?.({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 200,
      duration: 300,
      deviceId: "emulator-5554"
    })).resolves.toEqual({
      action: "swipe",
      deviceId: "emulator-5554",
      message: "Swiped from (0, 0) to (100, 200)"
    });
    await expect(integration.typeText?.({ text: "salaam", deviceId: "emulator-5554" })).resolves.toEqual({
      action: "type",
      deviceId: "emulator-5554",
      message: "Typed: salaam"
    });
    await expect(integration.keyPress?.({ key: "enter", deviceId: "emulator-5554" })).resolves.toEqual({
      action: "key_press",
      deviceId: "emulator-5554",
      message: "Pressed key: enter"
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(callTool).toHaveBeenNthCalledWith(1, {
      name: "mobile_init",
      arguments: {}
    });
    expect(callTool).toHaveBeenNthCalledWith(2, {
      name: "mobile_dump_ui",
      arguments: { deviceId: "emulator-5554" }
    });
    expect(callTool).toHaveBeenNthCalledWith(3, {
      name: "mobile_tap",
      arguments: { x: 10, y: 20, deviceId: "emulator-5554" }
    });
    expect(callTool).toHaveBeenNthCalledWith(4, {
      name: "mobile_swipe",
      arguments: {
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 200,
        duration: 300,
        deviceId: "emulator-5554"
      }
    });
    expect(callTool).toHaveBeenNthCalledWith(5, {
      name: "mobile_type",
      arguments: { text: "salaam", deviceId: "emulator-5554" }
    });
    expect(callTool).toHaveBeenNthCalledWith(6, {
      name: "mobile_key_press",
      arguments: { key: "enter", deviceId: "emulator-5554" }
    });
  });

  it("robustly parses nested UI hierarchies and escaped attributes in dumpUi", async () => {
    const nestedXml = `
      <hierarchy>
        <node text="Outer" class="android.view.ViewGroup" bounds="[0,0][100,100]">
          <node text="Inner &quot;quoted&quot;" content-desc="Description &gt; here" class="android.widget.TextView" bounds="[10,10][90,90]" />
        </node>
      </hierarchy>
    `;

    const callTool = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: "init" }] })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: nestedXml }]
      });

    const integration = createMobileMcpIntegration({
      resolvePackageBin: vi.fn(async () => "C:/deps/mobile-mcp/dist/index.js"),
      createClient: vi.fn(() => ({ connect: vi.fn(), callTool })),
      createTransport: vi.fn(() => ({ pid: 9876 })),
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined)
    });

    const result = await integration.dumpUi?.({});

    expect(result?.nodes).toContainEqual(expect.objectContaining({
      text: "Outer",
      className: "android.view.ViewGroup"
    }));
    expect(result?.nodes).toContainEqual(expect.objectContaining({
      text: 'Inner "quoted"',
      contentDescription: "Description > here",
      className: "android.widget.TextView"
    }));
  });

});
