import { describe, expect, it, vi } from "vitest";
import {
  createExpoCliIntegration,
  stopChildProcess
} from "../../src/integrations/expo-cli.js";
import type { RunCommandInput, RunCommandResult } from "../../src/utils/spawn.js";

describe("createExpoCliIntegration", () => {
  it("uses taskkill on Windows when stopping a spawned Metro process", async () => {
    const kill = vi.fn();
    const once = vi.fn();
    const runCommand = vi.fn(async () => ({ exitCode: 0, timedOut: false }));

    await stopChildProcess(
      {
        pid: 4321,
        killed: false,
        kill,
        once
      },
      {
        platform: "win32",
        runCommand
      }
    );

    expect(runCommand).toHaveBeenCalledWith({
      command: "taskkill",
      args: ["/PID", "4321", "/T", "/F"],
      timeoutMs: 5000
    });
    expect(kill).not.toHaveBeenCalled();
    expect(once).not.toHaveBeenCalled();
  });

  it("uses direct child termination on non-Windows platforms", async () => {
    const kill = vi.fn();
    const once = vi.fn((_event: string, handler: () => void) => {
      handler();
    });
    const runCommand = vi.fn(async () => ({ exitCode: 0, timedOut: false }));

    await stopChildProcess(
      {
        pid: 4321,
        killed: false,
        kill,
        once
      },
      {
        platform: "linux",
        runCommand
      }
    );

    expect(kill).toHaveBeenCalledOnce();
    expect(once).toHaveBeenCalledWith("close", expect.any(Function));
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("starts Metro with Expo CLI args and resolves when readiness is detected", async () => {
    const spawnMetroProcess = vi.fn(async (input: {
      command: string;
      args: string[];
      cwd?: string;
      onStdoutLine?: (line: string) => void;
      onStderrLine?: (line: string) => void;
    }) => {
      input.onStdoutLine?.("Starting project at C:/dev/app");
      input.onStdoutLine?.("Metro waiting on http://127.0.0.1:8081");

      return {
        pid: 2468,
        stop: vi.fn(async () => undefined)
      };
    });

    const expoCli = createExpoCliIntegration({
      platform: "win32",
      clock: () => 1700000000000,
      spawnMetroProcess
    });

    const logLines: Array<{ level: string; text: string; at: number }> = [];
    const controller = await expoCli.startMetro({
      projectRoot: "C:/dev/app",
      port: 8081,
      clear: true,
      onLogLine: (entry) => {
        logLines.push(entry);
      }
    });

    expect(spawnMetroProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "npx.cmd",
        args: ["expo", "start", "--port", "8081", "--clear"],
        cwd: "C:/dev/app"
      })
    );
    expect(controller.pid).toBe(2468);
    expect(controller.port).toBe(8081);
    expect(controller.devServerUrl).toBe("http://127.0.0.1:8081");
    expect(logLines).toEqual([
      {
        level: "info",
        text: "Starting project at C:/dev/app",
        at: 1700000000000
      },
      {
        level: "info",
        text: "Metro waiting on http://127.0.0.1:8081",
        at: 1700000000000
      }
    ]);
  });

  it("falls back to a listening port check when Metro readiness markers are absent", async () => {
    const spawnMetroProcess = vi.fn(async (_input: {
      command: string;
      args: string[];
      cwd?: string;
      onStdoutLine?: (line: string) => void;
      onStderrLine?: (line: string) => void;
    }) => ({
      pid: 8642,
      stop: vi.fn(async () => undefined)
    }));
    const waitForPortReady = vi.fn(async () => true);

    const expoCli = createExpoCliIntegration({
      platform: "win32",
      spawnMetroProcess,
      waitForPortReady,
      metroStartTimeoutMs: 1000
    });

    const controller = await expoCli.startMetro({
      projectRoot: "C:/dev/app",
      port: 19006
    });

    expect(waitForPortReady).toHaveBeenCalledWith({
      host: "127.0.0.1",
      port: 19006,
      timeoutMs: 1000
    });
    expect(controller.devServerUrl).toBe("http://127.0.0.1:19006");
  });

  it("runs Android through Expo CLI and returns a structured failure result", async () => {
    const runCommand = vi.fn<(input: RunCommandInput) => Promise<RunCommandResult>>(async (input) => {
      input.onStdoutLine?.("Running prebuild");
      input.onStdoutLine?.("Running Gradle task 'assembleDebug'");
      input.onStderrLine?.("FAILURE: Build failed with an exception.");
      input.onStderrLine?.("Could not resolve com.facebook.react:react-android:0.76.0.");
      return { exitCode: 1, timedOut: false };
    });

    const expoCli = createExpoCliIntegration({
      platform: "win32",
      clock: () => 1700000000000,
      runCommand
    });

    const logLines: Array<{ level: string; text: string; at: number }> = [];
    const result = await expoCli.runAndroid({
      projectRoot: "C:/dev/app",
      onLogLine: (entry) => {
        logLines.push(entry);
      }
    });

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "npx.cmd",
        args: ["expo", "run:android"],
        cwd: "C:/dev/app"
      })
    );
    expect(result).toEqual({
      ok: false,
      phase: "gradle_build",
      output: [
        "Running prebuild",
        "Running Gradle task 'assembleDebug'",
        "FAILURE: Build failed with an exception.",
        "Could not resolve com.facebook.react:react-android:0.76.0."
      ].join("\n")
    });
    expect(logLines.at(-1)).toEqual({
      level: "error",
      text: "Could not resolve com.facebook.react:react-android:0.76.0.",
      at: 1700000000000
    });
  });
});
