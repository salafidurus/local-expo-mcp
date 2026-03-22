import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("commitlint config", () => {
  it("extends the conventional commitlint preset", async () => {
    const configPath = path.resolve("commitlint.config.cjs");
    const config = await readFile(configPath, "utf8");

    expect(config).toContain("@commitlint/config-conventional");
  });
});
