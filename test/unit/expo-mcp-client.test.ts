import { describe, expect, it, vi } from "vitest";
import { createExpoMcpIntegration } from "../../src/integrations/expo-mcp-client.js";

describe("createExpoMcpIntegration", () => {
  it("resolves the installed expo-mcp bin, connects over stdio, and supports detach", async () => {
    const connect = vi.fn(async () => undefined);
    const closeClient = vi.fn(async () => undefined);
    const closeTransport = vi.fn(async () => undefined);
    const createClient = vi.fn(() => ({ connect, close: closeClient }));
    const createTransport = vi.fn(() => ({ pid: 4321, close: closeTransport }));

    const integration = createExpoMcpIntegration({
      clock: () => 1700000000000,
      resolvePackageBin: vi.fn(async () => "C:/deps/expo-mcp/bin/expo-mcp.mjs"),
      createClient,
      createTransport,
      nodeCommand: "node"
    });

    const result = await integration.attach({
      projectRoot: "C:/dev/app",
      devServerUrl: "http://127.0.0.1:8081"
    });

    expect(createTransport).toHaveBeenCalledWith({
      command: "node",
      args: [
        "C:/deps/expo-mcp/bin/expo-mcp.mjs",
        "--dev-server-url",
        "http://127.0.0.1:8081"
      ],
      cwd: "C:/dev/app",
      stderr: "pipe"
    });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(result.pid).toBe(4321);
    expect(result.startedAt).toBe(1700000000000);
    expect(result.status).toBe("attached");

    await result.detach();

    expect(closeClient).toHaveBeenCalledTimes(1);
    expect(closeTransport).toHaveBeenCalledTimes(1);
  });
});
