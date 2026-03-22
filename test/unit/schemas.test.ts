import { describe, expect, it } from "vitest";
import { ZodTypeAny } from "zod";
import { toolSchemas } from "../../src/mcp/schemas.js";

describe("toolSchemas", () => {
  it("requires projectRoot for project-scoped tools", () => {
    const projectInspect = toolSchemas.project_inspect as ZodTypeAny;
    const metroStart = toolSchemas.metro_start as ZodTypeAny;
    const sessionSummary = toolSchemas.session_summary as ZodTypeAny;

    expect(projectInspect.safeParse({}).success).toBe(false);
    expect(projectInspect.safeParse({ projectRoot: "C:/dev/app" }).success).toBe(true);

    expect(metroStart.safeParse({}).success).toBe(false);
    expect(metroStart.safeParse({ projectRoot: "C:/dev/app", port: 8081, clear: true }).success).toBe(true);

    expect(sessionSummary.safeParse({}).success).toBe(false);
    expect(sessionSummary.safeParse({ projectRoot: "C:/dev/app" }).success).toBe(true);
  });

  it("validates optional tool-specific fields", () => {
    const metroLogsRecent = toolSchemas.metro_logs_recent as ZodTypeAny;
    const deviceLogsRecent = toolSchemas.device_logs_recent as ZodTypeAny;
    const deviceScreenshot = toolSchemas.device_screenshot as ZodTypeAny;
    const deviceDumpUi = toolSchemas.device_dump_ui as ZodTypeAny;
    const deviceTap = toolSchemas.device_tap as ZodTypeAny;
    const deviceSwipe = toolSchemas.device_swipe as ZodTypeAny;
    const deviceTypeText = toolSchemas.device_type_text as ZodTypeAny;
    const deviceKeyPress = toolSchemas.device_key_press as ZodTypeAny;
    const deviceAppLaunch = toolSchemas.device_app_launch as ZodTypeAny;
    const deviceAppTerminate = toolSchemas.device_app_terminate as ZodTypeAny;
    const deviceForegroundApp = toolSchemas.device_foreground_app as ZodTypeAny;

    expect(metroLogsRecent.safeParse({ projectRoot: "C:/dev/app", limit: 25 }).success).toBe(true);
    expect(metroLogsRecent.safeParse({ projectRoot: "C:/dev/app", limit: "25" }).success).toBe(false);

    expect(deviceLogsRecent.safeParse({}).success).toBe(true);
    expect(deviceLogsRecent.safeParse({ limit: 50 }).success).toBe(true);
    expect(deviceLogsRecent.safeParse({ limit: "50" }).success).toBe(false);

    expect(deviceScreenshot.safeParse({}).success).toBe(true);
    expect(deviceScreenshot.safeParse({ deviceId: "emulator-5554" }).success).toBe(true);
    expect(deviceScreenshot.safeParse({ deviceId: 123 }).success).toBe(false);

    expect(deviceDumpUi.safeParse({}).success).toBe(true);
    expect(deviceDumpUi.safeParse({ deviceId: "emulator-5554" }).success).toBe(true);
    expect(deviceDumpUi.safeParse({ deviceId: 123 }).success).toBe(false);

    expect(deviceTap.safeParse({ x: 10, y: 20 }).success).toBe(true);
    expect(deviceTap.safeParse({ x: -1, y: 20 }).success).toBe(false);
    expect(deviceTap.safeParse({ x: 10 }).success).toBe(false);

    expect(deviceSwipe.safeParse({ startX: 0, startY: 0, endX: 100, endY: 200 }).success).toBe(true);
    expect(deviceSwipe.safeParse({ startX: 0, startY: 0, endX: 100, endY: 200, duration: 250 }).success).toBe(true);
    expect(deviceSwipe.safeParse({ startX: 0, startY: 0, endX: 100 }).success).toBe(false);

    expect(deviceTypeText.safeParse({ text: "salaam" }).success).toBe(true);
    expect(deviceTypeText.safeParse({ text: "" }).success).toBe(false);

    expect(deviceKeyPress.safeParse({ key: "enter" }).success).toBe(true);
    expect(deviceKeyPress.safeParse({ key: "" }).success).toBe(false);

    expect(deviceAppLaunch.safeParse({ appId: "com.example.app" }).success).toBe(true);
    expect(deviceAppLaunch.safeParse({ appId: "com.example.app", deviceId: "emulator-5554" }).success).toBe(true);
    expect(deviceAppLaunch.safeParse({}).success).toBe(false);

    expect(deviceAppTerminate.safeParse({ appId: "com.example.app" }).success).toBe(true);
    expect(deviceAppTerminate.safeParse({ appId: 123 }).success).toBe(false);

    expect(deviceForegroundApp.safeParse({}).success).toBe(true);
    expect(deviceForegroundApp.safeParse({ deviceId: "emulator-5554" }).success).toBe(true);
    expect(deviceForegroundApp.safeParse({ deviceId: 123 }).success).toBe(false);
  });

  it("keeps device_list as an empty object schema", () => {
    const deviceList = toolSchemas.device_list as ZodTypeAny;

    expect(deviceList.safeParse({}).success).toBe(true);
    expect(deviceList.safeParse({ unexpected: true }).success).toBe(false);
  });
});
