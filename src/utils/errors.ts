export type ErrorCode =
  | "INVALID_INPUT"
  | "PROJECT_NOT_FOUND"
  | "PROJECT_NOT_EXPO"
  | "UNSUPPORTED_PLATFORM"
  | "TIMEOUT"
  | "PROCESS_START_FAILED"
  | "PROCESS_EXITED_EARLY"
  | "PROCESS_NOT_RUNNING"
  | "PROCESS_ALREADY_RUNNING"
  | "INTERNAL_STATE_ERROR"
  | "INTERNAL_TOOL_ERROR"
  | "METRO_START_TIMEOUT"
  | "METRO_START_FAILED"
  | "METRO_NOT_RUNNING"
  | "METRO_URL_NOT_DETECTED"
  | "METRO_LOG_UNAVAILABLE"
  | "METRO_PARSE_FAILED"
  | "EXPO_MCP_EXECUTABLE_NOT_FOUND"
  | "EXPO_MCP_ATTACH_FAILED"
  | "EXPO_MCP_NOT_ATTACHED"
  | "EXPO_MCP_COMMAND_FAILED"
  | "MOBILE_MCP_EXECUTABLE_NOT_FOUND"
  | "MOBILE_MCP_ATTACH_FAILED"
  | "MOBILE_MCP_NOT_ATTACHED"
  | "MOBILE_MCP_COMMAND_FAILED"
  | "CHILD_MCP_EXITED"
  | "ANDROID_RUN_TIMEOUT"
  | "ANDROID_RUN_ALREADY_ACTIVE"
  | "ANDROID_BUILD_FAILED"
  | "ADB_NOT_FOUND"
  | "ADB_COMMAND_FAILED"
  | "ANDROID_DEVICE_UNAVAILABLE"
  | "ANDROID_SCREENSHOT_UNSUPPORTED"
  | "IOS_UNSUPPORTED_ON_THIS_PLATFORM"
  | "IOS_RUN_ALREADY_ACTIVE"
  | "IOS_RUN_TIMEOUT"
  | "IOS_BUILD_FAILED"
  | "IOS_SIMULATOR_UNAVAILABLE";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(code, message, details);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function errorMessage(error: unknown, fallback = "Unexpected tool failure"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function toAppError(
  error: unknown,
  code: ErrorCode = "INTERNAL_TOOL_ERROR",
  details?: Record<string, unknown>
): AppError {
  if (isAppError(error)) {
    return error;
  }

  return createError(code, errorMessage(error), details);
}
