import { describe, expect, it } from "vitest";
import { createAppContext } from "../../src/app-context.js";
import { createAndroidRunHandler } from "../../src/tools/android-run.js";

function createFakeAndroidExpoCli() {
  return {
    async runAndroid(input: {
      projectRoot: string;
      onLogLine?: (entry: { level: "info" | "warn" | "error"; text: string; at: number }) => void;
    }) {
      input.onLogLine?.({ level: "info", text: "Running prebuild", at: 1000 });
      input.onLogLine?.({ level: "info", text: "Running Gradle task 'assembleDebug'", at: 1001 });
      input.onLogLine?.({ level: "error", text: "Could not resolve com.facebook.react:react-android:0.76.0.", at: 1002 });

      return {
        ok: false as const,
        phase: "gradle_build",
        output: `Could not resolve com.facebook.react:react-android:0.76.0.`
      };
    }
  };
}

describe("android_run", () => {
  it("returns structured Gradle failure information", async () => {
    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        androidExpoCli: createFakeAndroidExpoCli()
      }
    });

    const androidRun = createAndroidRunHandler(context);

    const result = await androidRun({
      projectRoot: "C:/dev/app"
    });

    expect(result).toEqual({
      ok: false,
      phase: "gradle_build",
      errorType: "dependency_resolution",
      summary: "Could not resolve com.facebook.react:react-android:0.76.0"
    });
  });

  it("blocks duplicate Android runs for the same project", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    const context = createAppContext({
      clock: () => 1000,
      integrations: {
        expoCli: {
          async startMetro() {
            throw new Error("not used");
          }
        },
        androidExpoCli: {
          async runAndroid() {
            await pending;
            return {
              ok: true as const,
              phase: "launch",
              output: "Success"
            };
          }
        }
      }
    });

    const androidRun = createAndroidRunHandler(context);

    const first = androidRun({ projectRoot: "C:/dev/app" });
    const second = await androidRun({ projectRoot: "C:/dev/app" });
    release();
    await first;

    expect(second).toEqual({
      ok: false,
      error: {
        code: "ANDROID_RUN_ALREADY_ACTIVE",
        message: "Android run is already active for this project",
        details: {
          projectRoot: "C:/dev/app"
        }
      }
    });
  });
});
