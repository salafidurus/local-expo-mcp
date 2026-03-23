import { describe, expect, it } from "vitest";
import {
  buildTerminateProcessCommand,
  prepareSpawnCommand,
  runCommand
} from "../../src/utils/spawn.js";

describe("prepareSpawnCommand", () => {
  it("uses ComSpec for Windows cmd launchers when a .cmd file must be executed", () => {
    const prepared = prepareSpawnCommand({
      platform: "win32",
      command: "npx.cmd",
      args: ["expo", "start"]
    });

    expect(prepared.command.toLowerCase()).toContain("cmd.exe");
    expect(prepared.args).toEqual(["/d", "/s", "/c", "npx.cmd", "expo", "start"]);
  });

  it("handles spaces in command paths on Windows", () => {
    const commandWithSpaces = "C:\\Program Files\\nodejs\\npx.cmd";
    const prepared = prepareSpawnCommand({
      platform: "win32",
      command: commandWithSpaces,
      args: ["expo", "start"]
    });

    expect(prepared.command.toLowerCase()).toContain("cmd.exe");
    // We expect the command with spaces to be properly quoted when passed to cmd /c
    expect(prepared.args).toEqual(["/d", "/s", "/c", `"${commandWithSpaces}"`, "expo", "start"]);
  });

  it("leaves normal executables unchanged", () => {
    const prepared = prepareSpawnCommand({
      platform: "win32",
      command: "adb",
      args: ["devices"]
    });

    expect(prepared).toEqual({
      command: "adb",
      args: ["devices"]
    });
  });
});

describe("buildTerminateProcessCommand", () => {
  it("uses taskkill for Windows process-tree termination", () => {
    expect(buildTerminateProcessCommand({ platform: "win32", pid: 1234 })).toEqual({
      command: "taskkill",
      args: ["/PID", "1234", "/T", "/F"]
    });
  });

  it("uses direct kill semantics on non-Windows platforms", () => {
    expect(buildTerminateProcessCommand({ platform: "linux", pid: 1234 })).toEqual({
      command: "kill",
      args: ["1234"]
    });
  });
});

describe("runCommand", () => {
  it("captures stdout line by line", async () => {
    const lines: string[] = [];

    const result = await runCommand({
      command: process.execPath,
      args: [
        "-e",
        "console.log('first'); console.log('second');"
      ],
      onStdoutLine: (line) => {
        lines.push(line);
      }
    });

    expect(result.exitCode).toBe(0);
    expect(lines).toEqual(["first", "second"]);
  });

  it("times out long-running commands", async () => {
    const result = await runCommand({
      command: process.execPath,
      args: [
        "-e",
        "setTimeout(() => console.log('late'), 1000);"
      ],
      timeoutMs: 50
    });

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).not.toBe(0);
  });
});
