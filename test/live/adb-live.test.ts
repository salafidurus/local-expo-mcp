import { describe, expect, it } from "vitest";
import { createAdbIntegration } from "../../src/integrations/adb.js";

describe("adb live smoke", () => {
  it(
    "lists at least one Android device and reads recent logs",
    async () => {
      const adb = createAdbIntegration();
      const devices = await adb.listDevices();

      expect(devices.length).toBeGreaterThan(0);
      expect(devices.every((device) => device.platform === "android")).toBe(true);

      const logs = await adb.recentLogs({ limit: 20 });
      expect(Array.isArray(logs)).toBe(true);
    },
    30_000
  );
});
