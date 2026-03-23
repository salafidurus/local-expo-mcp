import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("CODEOWNERS", () => {
  it("covers release automation files with explicit ownership", async () => {
    const codeownersPath = path.resolve(".github/CODEOWNERS");
    const codeowners = (await readFile(codeownersPath, "utf8")).replace(/\r\n/g, "\n");

    expect(codeowners).toContain("CHANGELOG.md @olanrewajufarooq");
    expect(codeowners).toContain("release-plan.json @olanrewajufarooq");
    expect(codeowners).toContain(".github/workflows/release.yml @olanrewajufarooq");
    expect(codeowners).toContain("scripts/release/ @olanrewajufarooq");
  });
});
