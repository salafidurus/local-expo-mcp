import { spawn } from "node:child_process";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runCommand, PROCESS_TERMINATION_GRACE_PERIOD } from "../../src/utils/spawn.js";

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  return {
    ...original,
    spawn: vi.fn(original.spawn)
  };
});

describe("runCommand", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("terminates a hanging process after timeout and fallback (Unix)", async () => {
    const mockChild: any = {
      pid: 123,
      stdout: null,
      stderr: null,
      on: vi.fn(),
      kill: vi.fn(),
      unref: vi.fn()
    };

    vi.mocked(spawn).mockReturnValue(mockChild);

    const runPromise = runCommand({
      command: "hang",
      timeoutMs: 100
    });

    // Advance to timeoutMs
    vi.advanceTimersByTime(100);
    expect(mockChild.kill).toHaveBeenCalledWith(); // SIGTERM

    // Advance to grace period
    vi.advanceTimersByTime(PROCESS_TERMINATION_GRACE_PERIOD);
    if (process.platform !== "win32") {
      expect(mockChild.kill).toHaveBeenCalledWith("SIGKILL");
    } else {
      // Windows check taskkill spawn
      expect(spawn).toHaveBeenCalledWith("taskkill", expect.arrayContaining(["/PID", "123", "/T", "/F"]), expect.anything());
    }

    // Resolve 'close' to let runPromise finish
    const closeHandler = mockChild.on.mock.calls.find((call: any) => call[0] === "close")[1];
    closeHandler(1);

    const result = await runPromise;
    expect(result.timedOut).toBe(true);
  });
});
