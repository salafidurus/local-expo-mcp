import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export type RunCommandInput = {
  command: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
};

export type RunCommandResult = {
  exitCode: number;
  timedOut: boolean;
};

export type PreparedSpawnCommand = {
  command: string;
  args: string[];
};

export function prepareSpawnCommand(input: {
  platform?: NodeJS.Platform;
  command: string;
  args?: string[];
}): PreparedSpawnCommand {
  const platform = input.platform ?? process.platform;
  const args = input.args ?? [];

  if (platform === "win32" && /\.(cmd|bat)$/i.test(input.command)) {
    const command = input.command.includes(" ") ? `"${input.command}"` : input.command;
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", command, ...args]
    };
  }

  return {
    command: input.command,
    args
  };
}

export function buildTerminateProcessCommand(input: {
  platform?: NodeJS.Platform;
  pid: number;
}): PreparedSpawnCommand {
  const platform = input.platform ?? process.platform;

  if (platform === "win32") {
    return {
      command: "taskkill",
      args: ["/PID", String(input.pid), "/T", "/F"]
    };
  }

  return {
    command: "kill",
    args: [String(input.pid)]
  };
}

export const PROCESS_TERMINATION_GRACE_PERIOD = 5000;

export async function runCommand(input: RunCommandInput): Promise<RunCommandResult> {
  const prepared = prepareSpawnCommand({
    command: input.command,
    args: input.args
  });

  const child = spawn(prepared.command, prepared.args, {
    cwd: input.cwd,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let timedOut = false;
  let timeoutHandle: NodeJS.Timeout | undefined;
  let fallbackHandle: NodeJS.Timeout | undefined;

  if (child.stdout && input.onStdoutLine) {
    const rl = createInterface({ input: child.stdout });
    rl.on("line", input.onStdoutLine);
  }

  if (child.stderr && input.onStderrLine) {
    const rl = createInterface({ input: child.stderr });
    rl.on("line", input.onStderrLine);
  }

  if (input.timeoutMs !== undefined) {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      child.kill(); // SIGTERM

      fallbackHandle = setTimeout(() => {
        if (process.platform === "win32") {
          if (child.pid) {
            const terminate = buildTerminateProcessCommand({ pid: child.pid, platform: "win32" });
            spawn(terminate.command, terminate.args, { stdio: "ignore" }).unref();
          }
        } else {
          (child.kill as (signal: string) => boolean)("SIGKILL");
        }
      }, PROCESS_TERMINATION_GRACE_PERIOD);
      fallbackHandle.unref();
    }, input.timeoutMs);
  }

  return await new Promise((resolve, reject) => {
    child.on("error", (error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (fallbackHandle) clearTimeout(fallbackHandle);
      reject(error);
    });

    child.on("close", (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (fallbackHandle) clearTimeout(fallbackHandle);

      resolve({
        exitCode: code ?? (timedOut ? 1 : 0),
        timedOut
      });
    });
  });
}
