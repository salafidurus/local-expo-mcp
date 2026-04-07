import type { AdbDevice, AdbIntegration, MetroLogEntry } from "../app-context.js";
import {
  runCommand as defaultRunCommand,
  type RunCommandInput,
  type RunCommandResult
} from "../utils/spawn.js";

export function parseAdbTimestamp(line: string): number | undefined {
  const match = line.match(/^(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) return undefined;
  const [, month, day, hour, minute, second, ms] = match;
  const year = new Date().getFullYear();
  return new Date(
    year,
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
    parseInt(ms)
  ).getTime();
}

export function parseAdbDevicesOutput(lines: string[]): AdbDevice[] {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "List of devices attached")
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2)
    .map(([id, state]) => ({
      id,
      platform: "android" as const,
      state,
      guidance: getGuidanceForState(state)
    }));
}

function getGuidanceForState(state: string): string | undefined {
  switch (state) {
    case "unauthorized":
      return "Device unauthorized. Please accept the RSA key fingerprint prompt on your device screen.";
    case "offline":
      return "Device is offline. Try toggling USB debugging or reconnecting the cable.";
    case "recovery":
      return "Device is in recovery mode. Please reboot the device to normal mode.";
    case "sideload":
      return "Device is in sideload mode. Please reboot the device.";
    case "no permissions":
      return "Insufficient permissions to access the device. Try running adb as root or check udev rules on Linux.";
    default:
      return undefined;
  }
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
          at: parseAdbTimestamp(line) ?? clock()
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
