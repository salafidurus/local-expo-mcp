import { describe, expect, it, vi } from "vitest";
import { createAdbIntegration, parseAdbDevicesOutput } from "../../src/integrations/adb.js";
import type { RunCommandInput, RunCommandResult } from "../../src/utils/spawn.js";

describe("parseAdbDevicesOutput", () => {
  it("parses attached Android devices and their states", () => {
    const parsed = parseAdbDevicesOutput([
      "List of devices attached",
      "emulator-5554\tdevice",
      "R58M123ABC\toffline",
      "unauthorized-dev\tunauthorized",
      "recovery-dev\trecovery",
      ""
    ]);

    expect(parsed).toEqual([
      { id: "emulator-5554", platform: "android", state: "device", guidance: undefined },
      { id: "R58M123ABC", platform: "android", state: "offline", guidance: "Device is offline. Try toggling USB debugging or reconnecting the cable." },
      { id: "unauthorized-dev", platform: "android", state: "unauthorized", guidance: "Device unauthorized. Please accept the RSA key fingerprint prompt on your device screen." },
      { id: "recovery-dev", platform: "android", state: "recovery", guidance: "Device is in recovery mode. Please reboot the device to normal mode." }
    ]);
  });
});

describe("createAdbIntegration", () => {
  it("uses adb devices for device listing", async () => {
    const runCommand = vi.fn<(input: RunCommandInput) => Promise<RunCommandResult>>(async (input) => {
      input.onStdoutLine?.("List of devices attached");
      input.onStdoutLine?.("emulator-5554\tdevice");
      input.onStdoutLine?.("R58M123ABC\toffline");
      return { exitCode: 0, timedOut: false };
    });

    const adb = createAdbIntegration({ runCommand });
    const devices = await adb.listDevices();

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "adb",
        args: ["devices"]
      })
    );
    expect(devices).toEqual([
      { id: "emulator-5554", platform: "android", state: "device", guidance: undefined },
      { id: "R58M123ABC", platform: "android", state: "offline", guidance: "Device is offline. Try toggling USB debugging or reconnecting the cable." }
    ]);
  });

  it("uses adb logcat -d for recent logs and classifies log levels", async () => {
    const runCommand = vi.fn<(input: RunCommandInput) => Promise<RunCommandResult>>(async (input) => {
      const allLines = [
        "--------- beginning of main",
        "03-22 16:00:00.000  123  456 E ReactNativeJS: Boom",
        "03-22 16:00:01.000  123  456 W ReactNativeJS: Heads up",
        "03-22 16:00:02.000  123  456 I ReactNativeJS: Fine"
      ];

      const tIndex = input.args?.indexOf("-t");
      let linesToSend = allLines;
      if (tIndex !== undefined && tIndex !== -1 && input.args?.[tIndex + 1]) {
        const tLimit = parseInt(input.args[tIndex + 1]);
        // Simple mock of adb logcat -t behavior (it usually skips the "beginning of" line in the count)
        const dataLines = allLines.filter(l => !l.startsWith("---------"));
        linesToSend = [allLines[0], ...dataLines.slice(-tLimit)];
      }

      for (const line of linesToSend) {
        input.onStdoutLine?.(line);
      }
      return { exitCode: 0, timedOut: false };
    });

    const adb = createAdbIntegration({ runCommand, clock: () => 1700000000000 });
    const logs = await adb.recentLogs({ limit: 2 });

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "adb",
        args: ["logcat", "-d", "-t", "2"]
      })
    );
    expect(logs).toEqual([
      {
        level: "warn",
        text: "03-22 16:00:01.000  123  456 W ReactNativeJS: Heads up",
        at: 1700000000000
      },
      {
        level: "info",
        text: "03-22 16:00:02.000  123  456 I ReactNativeJS: Fine",
        at: 1700000000000
      }
    ]);
  });

  it("passes -t <limit> to adb logcat if limit is provided to avoid OOM", async () => {
    const runCommand = vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false });
    const adb = createAdbIntegration({ runCommand });

    await adb.recentLogs({ limit: 50 });

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ["logcat", "-d", "-t", "50"]
      })
    );
  });

  it("uses a default -t 1000 for adb logcat if no limit is provided", async () => {
    const runCommand = vi.fn().mockResolvedValue({ exitCode: 0, timedOut: false });
    const adb = createAdbIntegration({ runCommand });

    await adb.recentLogs();

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ["logcat", "-d", "-t", "1000"]
      })
    );
  });
});
