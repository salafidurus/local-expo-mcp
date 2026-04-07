import { errorResult } from "../mcp/responses.js";
import { parseGradleFailure } from "../parsers/gradle-parser.js";
import { createError } from "../utils/errors.js";
import type { AppContext } from "../app-context.js";
import { normalizeProjectRoot } from "../utils/paths.js";

export function createAndroidRunHandler(context: AppContext) {
  return async function androidRun(input: { projectRoot: string }) {
    const projectRoot = normalizeProjectRoot(input.projectRoot);

    if (context.runtime.activeAndroidRuns.has(projectRoot)) {
      return errorResult(
        createError("ANDROID_RUN_ALREADY_ACTIVE", "Android run is already active for this project", {
          projectRoot
        })
      );
    }

    if (!context.integrations.androidExpoCli) {
      return errorResult(
        createError("ANDROID_BUILD_FAILED", "Android Expo CLI integration is unavailable", {
          projectRoot
        })
      );
    }

    context.runtime.activeAndroidRuns.add(projectRoot);
    context.sessionStore.merge(projectRoot, {
      lastAndroidRun: {
        startedAt: context.clock(),
        status: "running"
      }
    });

    try {
      const result = await context.integrations.androidExpoCli.runAndroid({
        projectRoot,
        onLogLine: (entry) => {
          context.logStore.append(`android-run:${projectRoot}`, entry);
        }
      });

      if (!result.ok) {
        const parsed = parseGradleFailure(result.output);
        context.sessionStore.merge(projectRoot, {
          lastAndroidRun: {
            startedAt: context.clock(),
            status: "failed",
            phase: result.phase,
            summary: parsed?.summary ?? result.output
          }
        });

        return {
          ok: false as const,
          phase: result.phase,
          errorType: parsed?.type ?? "unknown",
          summary: parsed?.summary ?? result.output
        };
      }

      context.sessionStore.merge(projectRoot, {
        lastAndroidRun: {
          startedAt: context.clock(),
          status: "success",
          phase: result.phase,
          summary: result.output
        }
      });

      return {
        ok: true as const,
        phase: result.phase,
        summary: result.output
      };
    } finally {
      context.runtime.activeAndroidRuns.delete(projectRoot);
    }
  };
}

