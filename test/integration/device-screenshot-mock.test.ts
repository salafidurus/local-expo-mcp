import { describe, expect, it } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createDeviceScreenshotHandler } from "../../src/tools/device-screenshot.js";

describe("device_screenshot", () => {
  it("delegates screenshots to hidden mobile-mcp", async () => {
    let callCount = 0;
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        mobileMcp: {
          async screenshot(input: { deviceId?: string }) {
            callCount += 1;
            return {
              path: `C:/tmp/${input.deviceId ?? "active"}.png`
            };
          }
        }
      }
    });

    const screenshot = createDeviceScreenshotHandler(context);

    const result = await screenshot({ deviceId: "emulator-5554" });

    expect(callCount).toBe(1);
    expect(result).toEqual({
      ok: true,
      path: "C:/tmp/emulator-5554.png",
      source: "mobile-mcp"
    });
  });

  it("returns a typed unsupported error when hidden mobile-mcp is unavailable", async () => {
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        }
      }
    });

    const screenshot = createDeviceScreenshotHandler(context);

    const result = await screenshot({});

    expect(result).toEqual({
      ok: false,
      error: {
        code: "ANDROID_SCREENSHOT_UNSUPPORTED",
        message: "Device screenshot is unavailable without hidden mobile-mcp",
        details: {
          deviceId: undefined
        }
      }
    });
  });
});
