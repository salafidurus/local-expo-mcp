import { describe, expect, it, vi } from "vitest";
import { createAdbIntegration, parseAdbDevicesOutput } from "../../src/integrations/adb.js";
import type { RunCommandInput, RunCommandResult } from "../../src/utils/spawn.js";

describe("parseAdbDevicesOutput", () => {
  it("parses attached Android devices and their states", () => {
    const parsed = parseAdbDevicesOutput([
      "List of devices attached",
      "emulator-5554\tdevice",
      "R58M123ABC\toffline",
      ""
    ]);

    expect(parsed).toEqual([
      { id: "emulator-5554", platform: "android", state: "device" },
      { id: "R58M123ABC", platform: "android", state: "offline" }
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
      { id: "emulator-5554", platform: "android", state: "device" },
      { id: "R58M123ABC", platform: "android", state: "offline" }
    ]);
  });

  it("uses adb logcat -d for recent logs and classifies log levels", async () => {
    const runCommand = vi.fn<(input: RunCommandInput) => Promise<RunCommandResult>>(async (input) => {
      input.onStdoutLine?.("--------- beginning of main");
      input.onStdoutLine?.("03-22 16:00:00.000  123  456 E ReactNativeJS: Boom");
      input.onStdoutLine?.("03-22 16:00:01.000  123  456 W ReactNativeJS: Heads up");
      input.onStdoutLine?.("03-22 16:00:02.000  123  456 I ReactNativeJS: Fine");
      return { exitCode: 0, timedOut: false };
    });

    const adb = createAdbIntegration({ runCommand, clock: () => 1700000000000 });
    const logs = await adb.recentLogs({ limit: 2 });

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "adb",
        args: ["logcat", "-d"]
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
});
