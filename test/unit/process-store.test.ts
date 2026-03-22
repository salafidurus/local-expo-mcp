import { describe, expect, it } from "vitest";
import { ProcessStore } from "../../src/state/process-store.js";

describe("ProcessStore", () => {
  it("tracks a running process by name and owner", () => {
    const store = new ProcessStore();

    store.upsert({
      name: "metro",
      ownerKey: "project:C:/dev/app",
      pid: 1234,
      cwd: "C:/dev/app",
      startedAt: 100,
      status: "running",
      command: "npx.cmd",
      args: ["expo", "start"]
    });

    expect(store.get("metro", "project:C:/dev/app")).toMatchObject({
      pid: 1234,
      status: "running"
    });
  });

  it("updates process status without dropping prior metadata", () => {
    const store = new ProcessStore();

    store.upsert({
      name: "metro",
      ownerKey: "project:C:/dev/app",
      pid: 1234,
      cwd: "C:/dev/app",
      startedAt: 100,
      status: "running",
      command: "npx.cmd",
      args: ["expo", "start"]
    });

    store.updateStatus("metro", "project:C:/dev/app", "stopped", 200);

    expect(store.get("metro", "project:C:/dev/app")).toMatchObject({
      pid: 1234,
      status: "stopped",
      stoppedAt: 200
    });
  });
});
