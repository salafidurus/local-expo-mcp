import { describe, expect, it } from "vitest";
import { LockManager } from "../../src/locks.js";

describe("LockManager", () => {
  it("serializes work for the same key", async () => {
    const locks = new LockManager();
    const events: string[] = [];

    const first = locks.withLock("metro:C:/dev/app", async () => {
      events.push("first:start");
      await new Promise((resolve) => setTimeout(resolve, 30));
      events.push("first:end");
    });

    const second = locks.withLock("metro:C:/dev/app", async () => {
      events.push("second:start");
      events.push("second:end");
    });

    await Promise.all([first, second]);

    expect(events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end"
    ]);
  });

  it("allows different keys to proceed independently", async () => {
    const locks = new LockManager();
    const events: string[] = [];

    await Promise.all([
      locks.withLock("metro:C:/dev/app", async () => {
        events.push("metro");
      }),
      locks.withLock("android-run:C:/dev/app", async () => {
        events.push("android");
      })
    ]);

    expect(events.sort()).toEqual(["android", "metro"]);
  });

  it("clears the internal map after locks are released (preventing memory leak)", async () => {
    const locks = new LockManager();
    const key = "test-key";

    await locks.withLock(key, async () => {
      // Doing work
    });

    // We expect the internal map to be empty now
    // Since it's private, we use a count getter we'll add or any cast if we change it
    expect((locks as any).getQueueCount?.() ?? (locks as any).queues?.size).toBe(0);
  });
});
