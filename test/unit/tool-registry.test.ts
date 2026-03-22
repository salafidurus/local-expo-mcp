import { describe, expect, it } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createToolRegistry } from "../../src/mcp/tool-registry.js";

describe("createToolRegistry", () => {
  it("registers the expected user-facing tool names", () => {
    const context = createAppContext({
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        }
      }
    });

    const registry = createToolRegistry(context);

    expect(Object.keys(registry).sort()).toEqual([
      "android_run",
      "dev_server_attach",
      "device_app_launch",
      "device_app_terminate",
      "device_foreground_app",
      "device_list",
      "device_logs_recent",
      "device_screenshot",
      "metro_errors_recent",
      "metro_logs_recent",
      "metro_restart",
      "metro_start",
      "metro_status",
      "metro_stop",
      "project_inspect",
      "session_summary"
    ]);
  });
});
