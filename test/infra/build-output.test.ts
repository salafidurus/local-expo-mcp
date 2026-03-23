import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("build output", () => {
  it("does not emit tests or vitest config files into dist", async () => {
    const distPath = path.resolve("dist");
    const entries = await readdir(distPath).catch(() => {
      throw new Error("dist directory is missing—please run `bun run build` before this test");
    });

    expect(entries).not.toContain("test");
    expect(entries).not.toContain("vitest.config.js");
    expect(entries).not.toContain("vitest.config.d.ts");
    expect(entries).not.toContain("vitest.live.config.js");
    expect(entries).not.toContain("vitest.live.config.d.ts");
    expect(entries).toContain("server.js");
  });

  it("dist/server.js has the correct shebang for node-based execution", async () => {
    const serverJsPath = path.resolve("dist/server.js");
    const content = await readFile(serverJsPath, "utf8").catch(() => {
      throw new Error("dist/server.js is missing—please run `bun run build` before this test");
    });

    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});
