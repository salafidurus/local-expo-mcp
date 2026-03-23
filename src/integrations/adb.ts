import type { AdbDevice, AdbIntegration, MetroLogEntry } from "../app-context.js";
import {
  runCommand as defaultRunCommand,
  type RunCommandInput,
  type RunCommandResult
} from "../utils/spawn.js";

export function parseAdbDevicesOutput(lines: string[]): AdbDevice[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "List of devices attached")
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2)
    .map(([id, state]) => ({
      id,
      platform: "android" as const,
      state
    }));
}

export function createAdbIntegration(input?: {
  command?: string;
  clock?: () => number;
  runCommand?: (input: RunCommandInput) => Promise<RunCommandResult>;
}): AdbIntegration {
  const command = input?.command ?? "adb";
  const clock = input?.clock ?? (() => Date.now());
  const runCommand = input?.runCommand ?? defaultRunCommand;

  return {
    async listDevices() {
      const lines: string[] = [];
      const result = await runCommand({
        command,
        args: ["devices"],
        onStdoutLine: (line) => {
          lines.push(line);
        }
      });

      assertAdbSuccess(result, "adb devices");
      return parseAdbDevicesOutput(lines);
    },
    async recentLogs(options) {
      const limit = options?.limit ?? 1000;
      const lines: string[] = [];
      const result = await runCommand({
        command,
        args: ["logcat", "-d", "-t", String(limit)],
        onStdoutLine: (line) => {
          lines.push(line);
        }
      });

      assertAdbSuccess(result, "adb logcat -d");

      return lines
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0 && !line.startsWith("---------"))
        .map((line) => ({
          level: classifyAdbLogLevel(line),
          text: line,
          at: clock()
        } satisfies MetroLogEntry));
    }
  };
}

function assertAdbSuccess(result: RunCommandResult, commandDescription: string) {
  if (result.timedOut || result.exitCode !== 0) {
    throw new Error(`${commandDescription} failed with exit code ${result.exitCode}`);
  }
}

function classifyAdbLogLevel(line: string): MetroLogEntry["level"] {
  const match = line.match(/\s([EFWIDV])\s[^\s]+:/);
  const code = match?.[1];

  if (code === "E" || code === "F") {
    return "error";
  }

  if (code === "W") {
    return "warn";
  }

  return "info";
}
