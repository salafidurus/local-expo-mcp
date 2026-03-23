import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { createInterface } from "node:readline";
import type {
  AndroidExpoCliIntegration,
  ExpoCliIntegration,
  MetroController,
  MetroLogEntry
} from "../app-context.js";
import { parseMetroReadinessLine, isMetroStatusReady } from "../parsers/metro-readiness.js";
import {
  buildTerminateProcessCommand,
  prepareSpawnCommand,
  runCommand,
  type RunCommandInput,
  type RunCommandResult
} from "../utils/spawn.js";

export type ExpoCommandInput = {
  platform: NodeJS.Platform;
  expoArgs: string[];
};

export type ResolvedCommand = {
  command: string;
  args: string[];
};

type StopChildHandle = {
  pid?: number;
  killed?: boolean;
  kill: () => boolean;
  once: (event: "close", listener: () => void) => void;
};

export function buildExpoCommand(input: ExpoCommandInput): ResolvedCommand {
  return {
    command: input.platform === "win32" ? "npx.cmd" : "npx",
    args: ["expo", ...input.expoArgs]
  };
}

export async function stopChildProcess(
  child: StopChildHandle,
  input?: {
    platform?: NodeJS.Platform;
    runCommand?: (input: RunCommandInput) => Promise<RunCommandResult>;
    timeoutMs?: number;
  }
): Promise<void> {
  if (!child.pid || child.killed) {
    return;
  }

  const platform = input?.platform ?? process.platform;
  const executeCommand = input?.runCommand ?? runCommand;
  const timeoutMs = input?.timeoutMs ?? 5000;

  if (platform === "win32") {
    const terminate = buildTerminateProcessCommand({
      platform,
      pid: child.pid
    });

    await executeCommand({
      command: terminate.command,
      args: terminate.args,
      timeoutMs
    });
    return;
  }

  await new Promise<void>((resolve) => {
    let timeoutHandle: NodeJS.Timeout | undefined;

    const done = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      resolve();
    };

    child.once("close", done);
    child.kill(); // SIGTERM

    timeoutHandle = setTimeout(() => {
      (child.kill as (signal: string) => boolean)("SIGKILL");
      // Don't wait forever even for SIGKILL
      setTimeout(done, 1000).unref();
    }, timeoutMs);
  });
}

export function createExpoCliIntegration(input?: {
  platform?: NodeJS.Platform;
  clock?: () => number;
  metroStartTimeoutMs?: number;
  runCommand?: (input: RunCommandInput) => Promise<RunCommandResult>;
  spawnMetroProcess?: (input: {
    command: string;
    args: string[];
    cwd?: string;
    onStdoutLine?: (line: string) => void;
    onStderrLine?: (line: string) => void;
  }) => Promise<{ pid: number; stop: () => Promise<void> }>;
  waitForPortReady?: (input: {
    host: string;
    port: number;
    timeoutMs: number;
  }) => Promise<boolean>;
}): ExpoCliIntegration & AndroidExpoCliIntegration {
  const platform = input?.platform ?? process.platform;
  const clock = input?.clock ?? (() => Date.now());
  const metroStartTimeoutMs = input?.metroStartTimeoutMs ?? 60_000;
  const runExpoCommand = input?.runCommand ?? runCommand;
  const spawnMetroProcess =
    input?.spawnMetroProcess ??
    ((spawnInput) =>
      defaultSpawnMetroProcess({
        ...spawnInput,
        platform,
        runCommand: runExpoCommand
      }));
  const waitForPortReady = input?.waitForPortReady ?? defaultWaitForPortReady;

  return {
    async startMetro({ projectRoot, port, clear, onLogLine }) {
      const command = buildExpoCommand({
        platform,
        expoArgs: ["start", "--port", String(port), ...(clear ? ["--clear"] : [])]
      });

      let devServerUrl: string | undefined;
      let ready = false;
      let timeoutHandle: NodeJS.Timeout | undefined;
      let resolveReady!: () => void;
      const readyPromise = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Metro did not become ready within ${metroStartTimeoutMs}ms`));
        }, metroStartTimeoutMs);
      });

      const markReady = (url: string) => {
        if (ready) {
          return;
        }

        ready = true;
        devServerUrl = url;
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        resolveReady();
      };

      const handleReadiness = (line: string) => {
        const readiness = parseMetroReadinessLine(line);
        if (readiness.ready && readiness.devServerUrl) {
          markReady(readiness.devServerUrl);
        }
      };

      const processHandle = await spawnMetroProcess({
        ...command,
        cwd: projectRoot,
        onStdoutLine: (line) => {
          onLogLine?.(toLogEntry(line, "info", clock));
          handleReadiness(line);
        },
        onStderrLine: (line) => {
          onLogLine?.(toLogEntry(line, "error", clock));
          handleReadiness(line);
        }
      });

      void waitForPortReady({ host: "127.0.0.1", port, timeoutMs: metroStartTimeoutMs }).then(
        (reachable) => {
          if (reachable) {
            markReady(`http://127.0.0.1:${port}`);
          }
        }
      );

      try {
        await readyPromise;
      } catch (error) {
        await processHandle.stop();
        throw error;
      }

      if (!devServerUrl) {
        await processHandle.stop();
        throw new Error("Metro readiness did not provide a dev server URL");
      }

      return {
        pid: processHandle.pid,
        port,
        devServerUrl,
        stop: processHandle.stop
      } satisfies MetroController;
    },
    async runAndroid({ projectRoot, onLogLine }) {
      const command = buildExpoCommand({
        platform,
        expoArgs: ["run:android"]
      });
      const lines: string[] = [];

      const result = await runExpoCommand({
        ...command,
        cwd: projectRoot,
        timeoutMs: 10 * 60_000,
        onStdoutLine: (line) => {
          lines.push(line);
          onLogLine?.(toLogEntry(line, classifyBuildLogLevel(line), clock));
        },
        onStderrLine: (line) => {
          lines.push(line);
          onLogLine?.(toLogEntry(line, "error", clock));
        }
      });

      const output = lines.join("\n");
      const phase = classifyAndroidPhase(output);

      if (result.exitCode !== 0 || result.timedOut) {
        return {
          ok: false,
          phase,
          output
        };
      }

      return {
        ok: true,
        phase,
        output
      };
    }
  };
}

function toLogEntry(
  text: string,
  level: MetroLogEntry["level"],
  clock: () => number
): MetroLogEntry {
  return {
    level,
    text,
    at: clock()
  };
}

function classifyBuildLogLevel(line: string): MetroLogEntry["level"] {
  if (/\b(error|exception|failed|FAILURE:)\b/i.test(line)) {
    return "error";
  }

  if (/\bwarn(ing)?\b/i.test(line)) {
    return "warn";
  }

  return "info";
}

function classifyAndroidPhase(output: string): string {
  if (/install/i.test(output)) {
    return "install";
  }

  if (/assemble|gradle/i.test(output)) {
    return "gradle_build";
  }

  if (/prebuild/i.test(output)) {
    return "prebuild";
  }

  return "unknown";
}

async function defaultSpawnMetroProcess(input: {
  command: string;
  args: string[];
  cwd?: string;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
  platform: NodeJS.Platform;
  runCommand: (input: RunCommandInput) => Promise<RunCommandResult>;
}): Promise<{ pid: number; stop: () => Promise<void> }> {
  const prepared = prepareSpawnCommand({
    platform: input.platform,
    command: input.command,
    args: input.args
  });

  const child = spawn(prepared.command, prepared.args, {
    cwd: input.cwd,
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (child.stdout && input.onStdoutLine) {
    const stdoutReader = createInterface({ input: child.stdout });
    stdoutReader.on("line", input.onStdoutLine);
  }

  if (child.stderr && input.onStderrLine) {
    const stderrReader = createInterface({ input: child.stderr });
    stderrReader.on("line", input.onStderrLine);
  }

  return {
    pid: child.pid ?? -1,
    async stop() {
      await stopChildProcess(child, {
        platform: input.platform,
        runCommand: input.runCommand
      });
    }
  };
}

async function defaultWaitForPortReady(input: {
  host: string;
  port: number;
  timeoutMs: number;
}): Promise<boolean> {
  const deadline = Date.now() + input.timeoutMs;
  const url = `http://${input.host}:${input.port}/status`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(250) });
      if (response.ok) {
        const body = await response.text();
        if (isMetroStatusReady(body)) {
          return true;
        }
      }
    } catch {
      // Ignore errors (connection refused, timeout, etc.)
    }

    await sleep(250);
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
