import { describe, expect, it, vi } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createDeviceDumpUiHandler } from "../../src/tools/device-dump-ui.js";
import { createDeviceKeyPressHandler } from "../../src/tools/device-key-press.js";
import { createDeviceSwipeHandler } from "../../src/tools/device-swipe.js";
import { createDeviceTapHandler } from "../../src/tools/device-tap.js";
import { createDeviceTypeTextHandler } from "../../src/tools/device-type-text.js";

describe("device mobile-mcp gestures", () => {
  it("dumps the current UI through hidden mobile-mcp", async () => {
    const dumpUi = vi.fn(async () => ({
      raw: "<hierarchy />",
      nodes: [{ text: "Login", clickable: true }]
    }));
    const context = createAppContext({
      integrations: {
        expoCli: { async startMetro() { throw new Error("not used"); } },
        mobileMcp: {
          async screenshot() { throw new Error("not used"); },
          dumpUi
        }
      }
    });

    const handler = createDeviceDumpUiHandler(context);
    const result = await handler({ deviceId: "emulator-5554" });

    expect(result).toEqual({
      ok: true,
      raw: "<hierarchy />",
      nodes: [{ text: "Login", clickable: true }],
      source: "mobile-mcp"
    });
  });

  it("forwards tap, swipe, type, and key press through hidden mobile-mcp", async () => {
    const tap = vi.fn(async () => ({ action: "tap" as const, deviceId: "emulator-5554", message: "Tapped at (10, 20)" }));
    const swipe = vi.fn(async () => ({ action: "swipe" as const, deviceId: "emulator-5554", message: "Swiped from (0, 0) to (100, 200)" }));
    const typeText = vi.fn(async () => ({ action: "type" as const, deviceId: "emulator-5554", message: "Typed: salaam" }));
    const keyPress = vi.fn(async () => ({ action: "key_press" as const, deviceId: "emulator-5554", message: "Pressed key: enter" }));
    const context = createAppContext({
      integrations: {
        expoCli: { async startMetro() { throw new Error("not used"); } },
        mobileMcp: {
          async screenshot() { throw new Error("not used"); },
          tap,
          swipe,
          typeText,
          keyPress
        }
      }
    });

    await expect(createDeviceTapHandler(context)({ x: 10, y: 20, deviceId: "emulator-5554" })).resolves.toEqual({
      ok: true,
      action: "tap",
      deviceId: "emulator-5554",
      message: "Tapped at (10, 20)",
      source: "mobile-mcp"
    });
    await expect(createDeviceSwipeHandler(context)({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 200,
      duration: 300,
      deviceId: "emulator-5554"
    })).resolves.toEqual({
      ok: true,
      action: "swipe",
      deviceId: "emulator-5554",
      message: "Swiped from (0, 0) to (100, 200)",
      source: "mobile-mcp"
    });
    await expect(createDeviceTypeTextHandler(context)({ text: "salaam", deviceId: "emulator-5554" })).resolves.toEqual({
      ok: true,
      action: "type",
      deviceId: "emulator-5554",
      message: "Typed: salaam",
      source: "mobile-mcp"
    });
    await expect(createDeviceKeyPressHandler(context)({ key: "enter", deviceId: "emulator-5554" })).resolves.toEqual({
      ok: true,
      action: "key_press",
      deviceId: "emulator-5554",
      message: "Pressed key: enter",
      source: "mobile-mcp"
    });
  });
});
