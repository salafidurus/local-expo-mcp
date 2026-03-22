import { describe, expect, it } from "vitest";
import { RingBuffer } from "../../src/utils/ring-buffer.js";

describe("RingBuffer", () => {
  it("keeps the last N items in insertion order", () => {
    const buffer = new RingBuffer<number>(3);

    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);

    expect(buffer.toArray()).toEqual([2, 3, 4]);
  });

  it("returns the newest items when a limit is provided", () => {
    const buffer = new RingBuffer<string>(5);

    buffer.push("a");
    buffer.push("b");
    buffer.push("c");
    buffer.push("d");

    expect(buffer.toArray({ limit: 2 })).toEqual(["c", "d"]);
  });
});
