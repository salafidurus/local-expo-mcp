import { describe, expect, it } from "vitest";
import { parseMetroReadinessLine } from "../../src/parsers/metro-readiness.js";

describe("parseMetroReadinessLine", () => {
  it("detects a valid HTTP Metro readiness marker", () => {
    expect(
      parseMetroReadinessLine("Metro waiting on http://127.0.0.1:8081")
    ).toEqual({
      ready: true,
      devServerUrl: "http://127.0.0.1:8081",
      protocolHint: "http"
    });
  });

  it("accepts Expo-style marker lines with leading glyphs", () => {
    expect(
      parseMetroReadinessLine("› Metro waiting on http://localhost:8081")
    ).toEqual({
      ready: true,
      devServerUrl: "http://localhost:8081",
      protocolHint: "http"
    });
  });

  it("treats exp URLs as supplemental rather than attach-ready", () => {
    expect(
      parseMetroReadinessLine("Waiting on exp://127.0.0.1:8081")
    ).toEqual({
      ready: false,
      devServerUrl: undefined,
      protocolHint: "exp"
    });
  });

  it("ignores non-Metro webpack markers", () => {
    expect(
      parseMetroReadinessLine("Webpack waiting on http://localhost:19006")
    ).toEqual({
      ready: false,
      devServerUrl: undefined,
      protocolHint: undefined
    });
  });
});
