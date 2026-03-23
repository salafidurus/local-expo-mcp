import { describe, expect, it, vi } from "vitest";
import { buildExpoCommand, stopChildProcess } from "../../src/integrations/expo-cli.js";

describe("buildExpoCommand", () => {
  it("builds a Windows-safe expo start command", () => {
    const command = buildExpoCommand({
      platform: "win32",
      expoArgs: ["start", "--port", "8081", "--clear"]
    });

    expect(command).toEqual({
      command: "npx.cmd",
      args: ["expo", "start", "--port", "8081", "--clear"]
    });
  });

  it("builds a POSIX expo run command", () => {
    const command = buildExpoCommand({
      platform: "linux",
      expoArgs: ["run:android"]
    });

    expect(command).toEqual({
      command: "npx",
      args: ["expo", "run:android"]
    });
  });
});

describe("stopChildProcess", () => {
  it("terminates a process within the grace period even if it ignores SIGTERM (Unix)", async () => {
    const mockChild = {
      pid: 123,
      killed: false,
      kill: vi.fn(),
      once: vi.fn()
    };

    // Simulate a process that never closes
    // No-op for 'once' means it won't trigger the callback

    const stopPromise = stopChildProcess(mockChild as any, {
      platform: "linux",
      timeoutMs: 100 // Short timeout for testing
    });

    // It should resolve after the timeout because of the fallback
    await expect(stopPromise).resolves.toBeUndefined();
    expect(mockChild.kill).toHaveBeenCalledWith(); // First SIGTERM
    // Since we can't easily check for SIGKILL here without more complex mocks,
    // resolving is the primary indicator of the fallback.
  });

  it("sends SIGKILL after SIGTERM timeout on Unix", async () => {
    let closeCallback: ((code: number | null) => void) | null = null;
    
    const mockChild = {
      pid: 123,
      killed: false,
      kill: vi.fn((signal?: string) => {
        // Simulate process responding to the signal
        if (signal === undefined || signal === "SIGTERM") {
          // Don't call close - simulate process ignoring SIGTERM
        } else if (signal === "SIGKILL") {
          // Simulate process dying from SIGKILL
          if (closeCallback) closeCallback(9);
        }
      }),
      once: vi.fn((event: string, cb: (code: number | null) => void) => {
        if (event === "close") {
          closeCallback = cb;
        }
      })
    };

    const stopPromise = stopChildProcess(mockChild as any, {
      platform: "linux",
      timeoutMs: 50 // Very short timeout
    });

    await expect(stopPromise).resolves.toBeUndefined();
    expect(mockChild.kill).toHaveBeenCalledWith(); // First call: SIGTERM
    expect(mockChild.kill).toHaveBeenCalledWith("SIGKILL"); // Second call after timeout
  });

  it("terminates a process within the grace period on Windows", async () => {
    const mockChild = {
      pid: 123,
      killed: false,
      kill: vi.fn(),
      once: vi.fn()
    };

    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false });

    await stopChildProcess(mockChild as any, {
      platform: "win32",
      runCommand: mockRunCommand
    });

    expect(mockRunCommand).toHaveBeenCalledWith(expect.objectContaining({
      command: "taskkill",
      args: ["/PID", "123", "/T", "/F"]
    }));
  });
});
