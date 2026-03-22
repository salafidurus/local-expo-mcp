import { describe, expect, it } from "vitest";
import { buildExpoCommand } from "../../src/integrations/expo-cli.js";

describe("buildExpoCommand", () => {
  it("builds a Windows-safe expo start command", () => {
    const command = buildExpoCommand({
      platform: "win32",
      expoArgs: ["start", "--port", "8081", "--clear"]
    });

    expect(command).toEqual({
      command: "npx.cmd",
      args: ["expo", "start", "--port", "8081", "--clear"]
    });
  });

  it("builds a POSIX expo run command", () => {
    const command = buildExpoCommand({
      platform: "linux",
      expoArgs: ["run:android"]
    });

    expect(command).toEqual({
      command: "npx",
      args: ["expo", "run:android"]
    });
  });
});
