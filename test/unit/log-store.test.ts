import { describe, expect, it } from "vitest";
import { LogStore } from "../../src/state/log-store.js";

describe("LogStore", () => {
  it("stores bounded logs per channel", () => {
    const store = new LogStore(2);

    store.append("metro", { level: "info", text: "one", at: 1 });
    store.append("metro", { level: "warn", text: "two", at: 2 });
    store.append("metro", { level: "error", text: "three", at: 3 });

    expect(store.recent("metro")).toEqual([
      { level: "warn", text: "two", at: 2 },
      { level: "error", text: "three", at: 3 }
    ]);
  });

  it("returns the latest entries when a limit is supplied", () => {
    const store = new LogStore(10);

    store.append("metro", { level: "info", text: "one", at: 1 });
    store.append("metro", { level: "warn", text: "two", at: 2 });
    store.append("metro", { level: "error", text: "three", at: 3 });

    expect(store.recent("metro", 2)).toEqual([
      { level: "warn", text: "two", at: 2 },
      { level: "error", text: "three", at: 3 }
    ]);
  });
});
