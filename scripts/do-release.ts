import { readFileSync, writeFileSync } from "node:fs";
import { analyzeReleasePlan, readCommitsSinceTag } from "./release/release-plan.ts";
import { parseUnreleased, upsertReleaseChangelog } from "./release/release-pr.ts";

const PACKAGE_FILE = "package.json";
const CHANGELOG_FILE = "CHANGELOG.md";

function main(): void {
  const isoDate = new Date().toISOString().slice(0, 10);
  const packageJson = JSON.parse(readFileSync(PACKAGE_FILE, "utf8")) as { version: string };
  const changelog = readFileSync(CHANGELOG_FILE, "utf8");

  const commits = readCommitsSinceTag();
  const plan = analyzeReleasePlan(packageJson.version, commits);

  if (!plan) {
    process.stdout.write(JSON.stringify({ changed: false, reason: "no_releasable_commits" }));
    return;
  }

  // Merge any manually staged notes from the [Unreleased] section
  const manual = parseUnreleased(changelog);
  if (manual) {
    plan.notes.breaking.push(...manual.breaking);
    plan.notes.features.push(...manual.features);
    plan.notes.fixes.push(...manual.fixes);
    plan.notes.others.push(...manual.others);
  }

  const nextChangelog = upsertReleaseChangelog(changelog, plan.nextVersion, isoDate, plan.notes);

  writeFileSync(PACKAGE_FILE, JSON.stringify({ ...packageJson, version: plan.nextVersion }, null, 2) + "\n");
  writeFileSync(CHANGELOG_FILE, nextChangelog);

  process.stdout.write(JSON.stringify({ changed: true, version: plan.nextVersion }));
}

main();
