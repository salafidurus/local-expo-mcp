import { describe, expect, it } from "vitest";
import {
  upsertReleaseChangelog,
  parseUnreleased
} from "../../scripts/release/release-pr.ts";

describe("release PR helpers", () => {
  it("replaces the existing pending release section instead of duplicating it", () => {
    const changelog = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "## [0.1.1] - 2026-03-23",
      "",
      "### Fixed",
      "",
      "- handle metro port reuse",
      "",
      "## [0.1.0] - TBD",
      ""
    ].join("\n");

    const updated = upsertReleaseChangelog(
      changelog,
      "0.2.0",
      "2026-03-24",
      {
        breaking: [],
        features: ["add device app launch tool"],
        fixes: ["handle metro port reuse"],
        others: []
      },
      "0.1.1"
    );

    expect(updated).toContain("## [0.2.0] - 2026-03-24");
    expect(updated.match(/## \[0\.2\.0\]/g)?.length).toBe(1);
    expect(updated).not.toContain("## [0.1.1] - 2026-03-23");
  });

  it("parseUnreleased extracts notes from [Unreleased] section", () => {
    const changelog = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "### Added",
      "",
      "- My custom note",
      "",
      "## [1.0.0] - 2024-01-01",
      ""
    ].join("\n");
    const notes = parseUnreleased(changelog);
    expect(notes?.features).toContain("My custom note");
  });

  it("parseUnreleased returns null when section is absent", () => {
    expect(parseUnreleased("# Changelog\n\n## [1.0.0] - 2024-01-01\n")).toBeNull();
  });

  it("parseUnreleased returns null when [Unreleased] has no items", () => {
    expect(parseUnreleased("# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2024-01-01\n")).toBeNull();
  });

  it("parseUnreleased extracts breaking, fixed, and changed notes", () => {
    const changelog = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "### Breaking",
      "",
      "- Removed old API",
      "",
      "### Fixed",
      "",
      "- Bug in parser",
      "",
      "### Changed",
      "",
      "- Refactored internals",
      "",
      "## [1.0.0] - 2024-01-01",
      ""
    ].join("\n");
    const notes = parseUnreleased(changelog);
    expect(notes).not.toBeNull();
    expect(notes!.breaking).toContain("Removed old API");
    expect(notes!.fixes).toContain("Bug in parser");
    expect(notes!.others).toContain("Refactored internals");
  });
});
