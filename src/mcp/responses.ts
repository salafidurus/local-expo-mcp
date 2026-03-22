import type { AppError } from "../utils/errors.js";

export function okResult<T extends Record<string, unknown>>(payload: T): { ok: true } & T {
  return {
    ok: true,
    ...payload
  };
}

export function errorResult(error: AppError): {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
} {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    }
  };
}
