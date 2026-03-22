import { describe, expect, it, vi } from "vitest";
import { createAppContext, disposeAppContext } from "../../src/app-context.js";

describe("disposeAppContext", () => {
  it("stops metro controllers, detaches expo-mcp, closes mobile-mcp, and clears runtime state", async () => {
    const stopMetro = vi.fn(async () => undefined);
    const detachExpo = vi.fn(async () => undefined);
    const closeMobile = vi.fn(async () => undefined);

    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        mobileMcp: {
          async screenshot() {
            throw new Error("not used");
          },
          close: closeMobile
        }
      }
    });

    context.runtime.metroControllers.set("C:/dev/app", {
      pid: 1111,
      port: 8081,
      devServerUrl: "http://127.0.0.1:8081",
      stop: stopMetro
    });
    context.runtime.expoMcpAttachments.set("C:/dev/app", {
      pid: 2222,
      status: "attached",
      startedAt: 1000,
      detach: detachExpo
    });

    await disposeAppContext(context);

    expect(stopMetro).toHaveBeenCalledTimes(1);
    expect(detachExpo).toHaveBeenCalledTimes(1);
    expect(closeMobile).toHaveBeenCalledTimes(1);
    expect(context.runtime.metroControllers.size).toBe(0);
    expect(context.runtime.expoMcpAttachments.size).toBe(0);
    expect(context.runtime.latestDeviceInfo).toEqual([]);
  });
});
