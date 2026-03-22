import { describe, expect, it } from "vitest";
import { errorResult, okResult } from "../../src/mcp/responses.js";
import { AppError, createError } from "../../src/utils/errors.js";

describe("responses", () => {
  it("creates success envelopes", () => {
    expect(okResult({ value: 1 })).toEqual({ ok: true, value: 1 });
  });

  it("creates failure envelopes from app errors", () => {
    const error = createError("PROJECT_NOT_EXPO", "Not an Expo project", {
      projectRoot: "C:/dev/plain"
    });

    expect(errorResult(error)).toEqual({
      ok: false,
      error: {
        code: "PROJECT_NOT_EXPO",
        message: "Not an Expo project",
        details: {
          projectRoot: "C:/dev/plain"
        }
      }
    });
  });

  it("preserves AppError instances", () => {
    const error = new AppError("INVALID_INPUT", "Bad input");
    expect(error.code).toBe("INVALID_INPUT");
  });
});
