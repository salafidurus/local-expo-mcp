import { describe, expect, it } from "vitest";
import {
  analyzeReleasePlan,
  renderChangelogSection
} from "../../scripts/release/release-plan.ts";

describe("release plan", () => {
  it("chooses a patch release for fix commits", () => {
    const plan = analyzeReleasePlan(
      "0.1.0",
      [
        {
          hash: "a1",
          subject: "fix: handle metro port reuse",
          body: ""
        }
      ]
    );

    expect(plan).toEqual({
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

  it("chooses a minor release for feat commits", () => {
    const plan = analyzeReleasePlan(
      "0.1.0",
      [
        {
          hash: "b2",
          subject: "feat: add device app launch tool",
          body: ""
        }
      ]
    );

    expect(plan?.releaseType).toBe("minor");
    expect(plan?.nextVersion).toBe("0.2.0");
  });

  it("chooses a major release for breaking changes", () => {
    const plan = analyzeReleasePlan(
      "0.1.0",
      [
        {
          hash: "c3",
          subject: "feat!: replace metro session schema",
          body: "BREAKING CHANGE: metro session shape changed"
        }
      ]
    );

    expect(plan?.releaseType).toBe("major");
    expect(plan?.nextVersion).toBe("1.0.0");
    expect(plan?.notes.breaking).toEqual(["replace metro session schema"]);
  });

  it("returns null when no release-worthy commits are present", () => {
    const plan = analyzeReleasePlan(
      "0.1.0",
      [
        {
          hash: "d4",
          subject: "docs: refine README",
          body: ""
        },
        {
          hash: "e5",
          subject: "test: cover release workflow retry",
          body: ""
        }
      ]
    );

    expect(plan).toBeNull();
  });

  it("renders a changelog section grouped by change type", () => {
    const section = renderChangelogSection("0.2.0", "2026-03-23", {
      breaking: ["replace metro session schema"],
      features: ["add device app launch tool"],
      fixes: ["handle metro port reuse"],
      others: []
    });

    expect(section).toContain("## [0.2.0] - 2026-03-23");
    expect(section).toContain("### Breaking");
    expect(section).toContain("### Added");
    expect(section).toContain("### Fixed");
  });
});
