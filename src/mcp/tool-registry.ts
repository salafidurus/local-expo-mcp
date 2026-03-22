import type { AppContext } from "../app-context.js";
import { createAndroidRunHandler } from "../tools/android-run.js";
import { createDevServerAttachHandler } from "../tools/dev-server-attach.js";
import { createDeviceAppLaunchHandler } from "../tools/device-app-launch.js";
import { createDeviceAppTerminateHandler } from "../tools/device-app-terminate.js";
import { createDeviceForegroundAppHandler } from "../tools/device-foreground-app.js";
import { createDeviceListHandler } from "../tools/device-list.js";
import { createDeviceLogsRecentHandler } from "../tools/device-logs-recent.js";
import { createDeviceScreenshotHandler } from "../tools/device-screenshot.js";
import { createMetroErrorsRecentHandler } from "../tools/metro-errors-recent.js";
import { createMetroLogsRecentHandler } from "../tools/metro-logs-recent.js";
import { createMetroRestartHandler } from "../tools/metro-restart.js";
import { createMetroStartHandler } from "../tools/metro-start.js";
import { createMetroStatusHandler } from "../tools/metro-status.js";
import { createMetroStopHandler } from "../tools/metro-stop.js";
import { inspectProject } from "../tools/project-inspect.js";
import { createSessionSummaryHandler } from "../tools/session-summary.js";

export function createToolRegistry(context: AppContext) {
  return {
    project_inspect: inspectProject,
    metro_start: createMetroStartHandler(context),
    metro_stop: createMetroStopHandler(context),
    metro_restart: createMetroRestartHandler(context),
    metro_status: createMetroStatusHandler(context),
    metro_logs_recent: createMetroLogsRecentHandler(context),
    metro_errors_recent: createMetroErrorsRecentHandler(context),
    dev_server_attach: createDevServerAttachHandler(context),
    android_run: createAndroidRunHandler(context),
    device_list: createDeviceListHandler(context),
    device_logs_recent: createDeviceLogsRecentHandler(context),
    device_screenshot: createDeviceScreenshotHandler(context),
    device_app_launch: createDeviceAppLaunchHandler(context),
    device_app_terminate: createDeviceAppTerminateHandler(context),
    device_foreground_app: createDeviceForegroundAppHandler(context),
    session_summary: createSessionSummaryHandler(context)
  };
}
