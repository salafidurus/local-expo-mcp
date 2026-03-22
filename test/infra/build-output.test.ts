import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("build output", () => {
  it("does not emit tests or vitest config files into dist", async () => {
    const distPath = path.resolve("dist");
    const entries = await readdir(distPath);

    expect(entries).not.toContain("test");
    expect(entries).not.toContain("vitest.config.js");
    expect(entries).not.toContain("vitest.config.d.ts");
    expect(entries).not.toContain("vitest.live.config.js");
    expect(entries).not.toContain("vitest.live.config.d.ts");
    expect(entries).toContain("server.js");
  });
});
