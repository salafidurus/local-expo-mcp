import { describe, expect, it } from "vitest";
import {
  mergeReleaseState,
  renderReleasePrBody,
  upsertReleaseChangelog
} from "../../scripts/release/release-pr.ts";

describe("release PR state", () => {
  it("initializes a new pending release from an incoming plan", () => {
    const state = mergeReleaseState(null, {
      releaseType: "patch",
      nextVersion: "0.1.1",
      notes: {
        breaking: [],
        features: [],
        fixes: ["handle metro port reuse"],
        others: []
      }
    }, "0.1.0");

    expect(state).toEqual({
      baseVersion: "0.1.0",
      releaseType: "patch",
      nextVersion: "0.1.1",
      notes: {
        breaking: [],
        features: [],
        fixes: ["handle metro port reuse"],
        others: []
      }
    });
  });

  it("escalates the pending release type while preserving the original base version", () => {
    const state = mergeReleaseState({
      baseVersion: "0.1.0",
      releaseType: "patch",
      nextVersion: "0.1.1",
      notes: {
        breaking: [],
        features: [],
        fixes: ["handle metro port reuse"],
        others: []
      }
    }, {
      releaseType: "minor",
      nextVersion: "0.2.0",
      notes: {
        breaking: [],
        features: ["add device app launch tool"],
        fixes: [],
        others: []
      }
    }, "0.1.0");

    expect(state).toEqual({
      baseVersion: "0.1.0",
      releaseType: "minor",
      nextVersion: "0.2.0",
      notes: {
        breaking: [],
        features: ["add device app launch tool"],
        fixes: ["handle metro port reuse"],
        others: []
      }
    });
  });

  it("deduplicates repeated note entries while merging", () => {
    const state = mergeReleaseState({
      baseVersion: "0.1.0",
      releaseType: "minor",
      nextVersion: "0.2.0",
      notes: {
        breaking: [],
        features: ["add device app launch tool"],
        fixes: ["handle metro port reuse"],
        others: []
      }
    }, {
      releaseType: "patch",
      nextVersion: "0.1.1",
      notes: {
        breaking: [],
        features: [],
        fixes: ["handle metro port reuse"],
        others: ["refresh CI workflow"]
      }
    }, "0.1.0");

    expect(state.notes).toEqual({
      breaking: [],
      features: ["add device app launch tool"],
      fixes: ["handle metro port reuse"],
      others: ["refresh CI workflow"]
    });
  });

  it("renders a release PR body with version and grouped notes", () => {
    const body = renderReleasePrBody("0.2.0", {
      breaking: [],
      features: ["add device app launch tool"],
      fixes: ["handle metro port reuse"],
      others: []
    });

    expect(body).toContain("## Release 0.2.0");
    expect(body).toContain("- add device app launch tool");
    expect(body).toContain("- handle metro port reuse");
    expect(body).toContain("- [ ] Merge this PR to publish");
  });

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
});
