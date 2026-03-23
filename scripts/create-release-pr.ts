import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { analyzeReleasePlan } from "./release/release-plan.ts";
import {
  mergeReleaseState,
  renderReleasePrBody,
  upsertReleaseChangelog,
  type PendingReleaseState
} from "./release/release-pr.ts";

const RELEASE_BRANCH = "release/next";
const PLAN_FILE = "release-plan.json";
const PACKAGE_FILE = "package.json";
const CHANGELOG_FILE = "CHANGELOG.md";

function main(): void {
  const title = (process.env.RELEASE_PR_TITLE ?? "").trim();
  const body = process.env.RELEASE_PR_BODY ?? "";
  const sourceSha = process.env.RELEASE_SOURCE_SHA ?? "unknown";
  const isoDate = new Date().toISOString().slice(0, 10);

  if (!title) {
    process.stdout.write(JSON.stringify({ changed: false, reason: "missing_release_pr_title" }));
    return;
  }

  const existingBranch = hasRemoteBranch(RELEASE_BRANCH) ? `origin/${RELEASE_BRANCH}` : null;
  const packageJson = JSON.parse(readRepoFile(existingBranch, PACKAGE_FILE)) as Record<string, unknown> & { version: string };
  // Always read CHANGELOG.md from disk (the version on main) to respect manual fixes.
  // The automation will re-insert pending release notes into this base.
  const changelog = readRepoFile(null, CHANGELOG_FILE);
  const existingState = readPendingState(existingBranch);
  const baseVersion = existingState?.baseVersion ?? packageJson.version;

  const incomingPlan = analyzeReleasePlan(baseVersion, [
    {
      hash: sourceSha,
      subject: title,
      body
    }
  ]);

  if (!incomingPlan) {
    process.stdout.write(JSON.stringify({ changed: false, reason: "no_release_relevant_changes" }));
    return;
  }

  const nextState = mergeReleaseState(existingState, incomingPlan, baseVersion);
  const nextPackageJson = { ...packageJson, version: nextState.nextVersion };
  const nextChangelog = upsertReleaseChangelog(
    changelog,
    nextState.nextVersion,
    isoDate,
    nextState.notes,
    existingState?.nextVersion
  );

  const releaseTitle = `chore(release): ${nextState.nextVersion}`;
  const releaseBody = renderReleasePrBody(nextState.nextVersion, nextState.notes);

  writeFileSync(PACKAGE_FILE, `${JSON.stringify(nextPackageJson, null, 2)}\n`);
  writeFileSync(CHANGELOG_FILE, nextChangelog);
  writeFileSync(PLAN_FILE, `${JSON.stringify({
    ...nextState,
    sourceSha,
    title: releaseTitle,
    body: releaseBody
  }, null, 2)}\n`);

  process.stdout.write(JSON.stringify({
    changed: true,
    branch: RELEASE_BRANCH,
    version: nextState.nextVersion,
    title: releaseTitle,
    body: releaseBody
  }));
}

function readPendingState(ref: string | null): PendingReleaseState | null {
  const raw = readRepoFile(ref, PLAN_FILE, false);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as PendingReleaseState;
}

function readRepoFile(ref: string | null, relativePath: string, required = true): string {
  if (ref) {
    try {
      return execGit(["show", `${ref}:${toGitPath(relativePath)}`]);
    } catch {
      if (!required) {
        return "";
      }
    }
  }

  const absolutePath = path.resolve(relativePath);
  if (!existsSync(absolutePath)) {
    if (!required) {
      return "";
    }
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return readFileSync(absolutePath, "utf8");
}

function hasRemoteBranch(branchName: string): boolean {
  try {
    execGit(["rev-parse", "--verify", `origin/${branchName}`]);
    return true;
  } catch {
    return false;
  }
}

function execGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function toGitPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

main();
