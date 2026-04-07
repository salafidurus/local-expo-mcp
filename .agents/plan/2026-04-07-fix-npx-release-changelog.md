# Fix npx Entry Point, Release Workflow, and Changelog Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three broken areas: the npx entry point that opens VS Code, a two-PR release dance that is hard to manage, and duplicated changelog rendering code that will drift.

**Architecture:**
- Introduce a dedicated `src/cli.ts` entry point that unconditionally starts the server; keep `src/server.ts` as a pure library for tests.
- Replace the two-PR release flow with **release-on-every-push-to-main**: a single workflow job reads all git commits since the last tag, bumps the version, updates the changelog, commits back to main (with `[skip ci]`), tags, and publishes — no staging PR, no `release/next` branch.
- Consolidate duplicated `renderChangelogSection` / `bumpVersion` so they live only in `release-plan.ts`.

**Tech Stack:** TypeScript, Node.js ≥20, Bun (build/test runner), Vitest, GitHub Actions, `@modelcontextprotocol/sdk`

---

## Background & Root Causes

### Issue 1 — npx opens VS Code

`src/server.ts:168` guards `startServer()` with `import.meta.main`.
**`import.meta.main` is a Bun-only extension.** Node.js evaluates it as `undefined` (falsy) so the binary exits immediately without starting the server. Windows then falls back to the `.js` file association and opens VS Code.

**Fix:** Create `src/cli.ts` as the sole bin entry — no guard needed because this file is never imported by tests.

### Issue 2 — Release workflow is tedious

Current problems:
- Two-PR dance: feature PR with `publish` label → automation creates `release/next` → someone merges that too → automation publishes.
- Version bump is derived from only the **title of the last triggering PR**, not actual commit history.
- PR body is passed through a multiline `<<EOF` YAML heredoc — fragile with special characters.
- No way to add custom release notes (manual `[Unreleased]` handling was removed in commit `6678722`).
- `mergeReleaseState` / `PendingReleaseState` exist only to accumulate across multiple PRs — unnecessary once the full commit log is used.

**Fix (Option A — release on every push to main):**
- Remove `prepare_release_pr` job and the `release/next` branch entirely.
- Gate job: skip if HEAD commit is already a release commit (prevents infinite loop after the bot commits the version bump back).
- Single `release` job: `readCommitsSinceTag()` → `analyzeReleasePlan()` → bump `package.json` → update `CHANGELOG.md` → commit `chore(release): vX.Y.Z [skip ci]` → push tag → `npm publish` → create GitHub release.
- Re-introduce `parseUnreleased()` so developers can stage custom notes under `## [Unreleased]` in `CHANGELOG.md` before a release runs.

### Issue 3 — Changelog is not clean

`renderChangelogSection` is copy-pasted into `release-plan.ts:77–117` **and** `release-pr.ts:83–123`.
`bumpVersion` is duplicated at `release-plan.ts:119` and `release-pr.ts:170`.
`release-pr.ts` already imports from `release-plan.ts` — the duplication is accidental and will drift.

**Fix:** Export both helpers from `release-plan.ts`, delete the copies in `release-pr.ts`.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/cli.ts` | **Create** | Unconditional npx/node entry point |
| `src/server.ts` | **Modify** | Remove `import.meta.main` guard; keep all exports |
| `package.json` | **Modify** | `bin` → `./dist/cli.js`; add `release:do` script |
| `scripts/do-release.ts` | **Create** | Replaces `create-release-pr.ts`; reads commits, bumps version, writes changelog, exits non-zero if nothing to release |
| `scripts/create-release-pr.ts` | **Delete** | Superseded by `do-release.ts` |
| `scripts/release/release-plan.ts` | **Modify** | Export `bumpVersion`; add `readCommitsSinceTag()` |
| `scripts/release/release-pr.ts` | **Modify** | Remove duplicated helpers; import from `release-plan.ts`; add `parseUnreleased()`; remove `mergeReleaseState`, `renderReleasePrBody`, `PendingReleaseState` |
| `.github/workflows/release.yml` | **Rewrite** | Single `release` job; gate skips release commits; no staging PR |
| `test/infra/release-plan.test.ts` | **Modify** | Add tests for `readCommitsSinceTag`, `bumpVersion` export |
| `test/infra/release-pr.test.ts` | **Modify** | Add tests for `parseUnreleased`; remove stale `mergeReleaseState` tests |
| `CHANGELOG.md` | **Modify** | Add `## [Unreleased]` staging section |

---

## New Workflow Design

```
push to main
    │
    ▼
gate job
    ├─ HEAD subject matches "chore(release):" → skip (already released)
    └─ otherwise → trigger release job
         │
         ▼
    release job
         ├─ checkout + bun install + build + test
         ├─ bun run release:do
         │       ├─ readCommitsSinceTag()
         │       ├─ analyzeReleasePlan()  ← returns null if nothing releasable
         │       ├─ parseUnreleased(CHANGELOG.md)  ← merge any manual notes
         │       ├─ bump package.json version
         │       ├─ upsertReleaseChangelog()
         │       └─ write new version to stdout
         ├─ if version changed:
         │       ├─ git commit "chore(release): vX.Y.Z [skip ci]"
         │       ├─ git tag vX.Y.Z
         │       ├─ git push + git push --tags
         │       ├─ npm publish --provenance
         │       └─ gh release create vX.Y.Z
         └─ else: exit 0 (nothing to release)
```

---

## Task 1 — Fix the npx Entry Point

**Files:**
- Create: `src/cli.ts`
- Modify: `src/server.ts:168-170`
- Modify: `package.json` `bin` field

- [ ] **Step 1.1 — Verify existing tests pass before touching anything**

  ```bash
  bunx vitest run --reporter=verbose
  ```
  Expected: all pass.

- [ ] **Step 1.2 — Create `src/cli.ts`**

  ```ts
  #!/usr/bin/env node
  import { startServer } from "./server.js";
  void startServer();
  ```

- [ ] **Step 1.3 — Remove the `import.meta.main` guard from `src/server.ts`**

  Delete lines 168–170:
  ```ts
  if (import.meta.main) {
    void startServer();
  }
  ```
  The exports (`createServer`, `startServer`, etc.) remain untouched.

- [ ] **Step 1.4 — Update `package.json` `bin`**

  ```json
  "bin": {
    "local-expo-mcp": "./dist/cli.js"
  }
  ```

- [ ] **Step 1.5 — Build and smoke-test**

  ```bash
  bun run build
  node dist/cli.js &
  sleep 1
  kill %1
  echo "exit $?"
  ```
  Expected: process starts the MCP stdio loop and does not open VS Code.

- [ ] **Step 1.6 — Run all tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 1.7 — Commit**

  ```bash
  git add src/cli.ts src/server.ts package.json
  git commit -m "fix: separate cli entry point so npx runs server instead of opening editor"
  ```

---

## Task 2 — Consolidate Duplicated Release Helpers

**Files:**
- Modify: `scripts/release/release-plan.ts` — export `bumpVersion`
- Modify: `scripts/release/release-pr.ts` — remove duplicates, import from `release-plan.ts`

- [ ] **Step 2.1 — Write tests pinning the helpers before refactoring**

  In `test/infra/release-plan.test.ts`, add:
  ```ts
  import { bumpVersion } from "../../scripts/release/release-plan.ts";

  test("bumpVersion major", () => expect(bumpVersion("1.2.3", "major")).toBe("2.0.0"));
  test("bumpVersion minor", () => expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0"));
  test("bumpVersion patch", () => expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4"));
  ```

  ```bash
  bunx vitest run test/infra/release-plan.test.ts
  ```
  Expected: FAIL — `bumpVersion` is not exported yet.

- [ ] **Step 2.2 — Export `bumpVersion` from `release-plan.ts`**

  Change `function bumpVersion` → `export function bumpVersion` at `scripts/release/release-plan.ts:119`.

- [ ] **Step 2.3 — Run tests**

  Expected: PASS.

- [ ] **Step 2.4 — Delete duplicates from `release-pr.ts`**

  - Remove private `renderChangelogSection` (lines 83–123).
  - Remove private `bumpVersion` (lines 170–189).
  - Add to top of `release-pr.ts`:
    ```ts
    import { bumpVersion, renderChangelogSection } from "./release-plan.ts";
    ```

- [ ] **Step 2.5 — Run all tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 2.6 — Commit**

  ```bash
  git add scripts/release/release-plan.ts scripts/release/release-pr.ts test/infra/release-plan.test.ts
  git commit -m "refactor: remove duplicated bumpVersion and renderChangelogSection in release scripts"
  ```

---

## Task 3 — Add `parseUnreleased()` and Clean Up `release-pr.ts`

With Option A there is no release PR, so `mergeReleaseState`, `renderReleasePrBody`, and `PendingReleaseState` are dead code. This task removes them and adds `parseUnreleased()` in their place.

**Files:**
- Modify: `scripts/release/release-pr.ts`
- Modify: `test/infra/release-pr.test.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 3.1 — Write failing tests for `parseUnreleased`**

  In `test/infra/release-pr.test.ts`:
  ```ts
  import { parseUnreleased } from "../../scripts/release/release-pr.ts";

  test("parseUnreleased extracts notes from [Unreleased] section", () => {
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

  test("parseUnreleased returns null when section is absent", () => {
    expect(parseUnreleased("# Changelog\n\n## [1.0.0] - 2024-01-01\n")).toBeNull();
  });

  test("parseUnreleased returns null when [Unreleased] has no items", () => {
    expect(parseUnreleased("# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2024-01-01\n")).toBeNull();
  });
  ```

  ```bash
  bunx vitest run test/infra/release-pr.test.ts
  ```
  Expected: FAIL.

- [ ] **Step 3.2 — Remove dead code from `release-pr.ts`**

  Delete:
  - `PendingReleaseState` type
  - `mergeReleaseState()` function
  - `renderReleasePrBody()` function
  - Private `mergeNotes()` and `maxReleaseType()` (used only by `mergeReleaseState`)

  Keep: `upsertReleaseChangelog()`, `unique()` (export it).

- [ ] **Step 3.3 — Implement `parseUnreleased` in `release-pr.ts`**

  ```ts
  export function parseUnreleased(changelog: string): ReleaseNotes | null {
    const match = /## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|$)/i.exec(changelog);
    if (!match) return null;

    const section = match[1];
    const notes: ReleaseNotes = { breaking: [], features: [], fixes: [], others: [] };

    const blocks: Array<[RegExp, keyof ReleaseNotes]> = [
      [/### Breaking\b([\s\S]*?)(?=\n###|$)/i, "breaking"],
      [/### Added\b([\s\S]*?)(?=\n###|$)/i, "features"],
      [/### Fixed\b([\s\S]*?)(?=\n###|$)/i, "fixes"],
      [/### Changed\b([\s\S]*?)(?=\n###|$)/i, "others"]
    ];

    for (const [pattern, key] of blocks) {
      const block = pattern.exec(section);
      if (!block) continue;
      const items = [...block[1].matchAll(/^- (.+)$/gm)].map(m => m[1].trim());
      notes[key].push(...items);
    }

    return Object.values(notes).some(arr => arr.length > 0) ? notes : null;
  }
  ```

- [ ] **Step 3.4 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass, including new `parseUnreleased` tests.

- [ ] **Step 3.5 — Add `## [Unreleased]` placeholder to `CHANGELOG.md`**

  Insert between the header block and the first `## [0.2.0]` section:
  ```markdown
  ## [Unreleased]

  <!-- Stage custom release notes here. They will be merged with commit-derived notes on the next release. -->

  ```

- [ ] **Step 3.6 — Commit**

  ```bash
  git add scripts/release/release-pr.ts test/infra/release-pr.test.ts CHANGELOG.md
  git commit -m "refactor: remove release-PR dead code and add parseUnreleased for manual staging"
  ```

---

## Task 4 — Add `readCommitsSinceTag()` and `do-release.ts`

**Files:**
- Modify: `scripts/release/release-plan.ts` — add `readCommitsSinceTag()`
- Create: `scripts/do-release.ts` — full release preparation script
- Delete: `scripts/create-release-pr.ts`
- Modify: `package.json` — replace `release:prepare-pr` with `release:do`
- Modify: `test/infra/release-plan.test.ts`

- [ ] **Step 4.1 — Write a failing test for `readCommitsSinceTag`**

  In `test/infra/release-plan.test.ts`:
  ```ts
  import { readCommitsSinceTag } from "../../scripts/release/release-plan.ts";

  test("readCommitsSinceTag returns an array of ReleaseCommit objects", () => {
    const commits = readCommitsSinceTag();
    expect(Array.isArray(commits)).toBe(true);
    if (commits.length > 0) {
      expect(typeof commits[0].hash).toBe("string");
      expect(typeof commits[0].subject).toBe("string");
      expect(typeof commits[0].body).toBe("string");
    }
  });
  ```

  ```bash
  bunx vitest run test/infra/release-plan.test.ts
  ```
  Expected: FAIL — `readCommitsSinceTag` not exported.

- [ ] **Step 4.2 — Implement `readCommitsSinceTag` in `release-plan.ts`**

  Add at the top of the file:
  ```ts
  import { execFileSync } from "node:child_process";
  ```

  Add the function:
  ```ts
  export function readCommitsSinceTag(): ReleaseCommit[] {
    let ref = "";
    try {
      ref = execFileSync("git", ["describe", "--tags", "--abbrev=0", "--match", "v*"], {
        encoding: "utf8"
      }).trim();
    } catch {
      // No tags yet — read the full history
    }

    const range = ref ? `${ref}..HEAD` : "HEAD";
    const raw = execFileSync(
      "git",
      ["log", range, "--pretty=format:%H%x1f%s%x1f%b%x1e"],
      { encoding: "utf8" }
    ).trim();

    if (!raw) return [];

    return raw.split("\x1e").flatMap(entry => {
      const parts = entry.trim().split("\x1f");
      if (parts.length < 2 || !parts[0]) return [];
      return [{
        hash: parts[0].trim(),
        subject: parts[1].trim(),
        body: (parts[2] ?? "").trim()
      }];
    });
  }
  ```

- [ ] **Step 4.3 — Run the test**

  Expected: PASS.

- [ ] **Step 4.4 — Create `scripts/do-release.ts`**

  This script is run by the workflow. It exits `0` with `{ changed: false }` when there is nothing to release (the workflow skips committing/publishing), or exits `0` with `{ changed: true, version }` when files were updated.

  ```ts
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
  ```

- [ ] **Step 4.5 — Update `package.json` scripts**

  Remove `release:prepare-pr`, add `release:do`:
  ```json
  "release:do": "tsx scripts/do-release.ts",
  "release:publish": "npm publish --provenance --access public"
  ```

- [ ] **Step 4.6 — Delete `scripts/create-release-pr.ts`**

  ```bash
  git rm scripts/create-release-pr.ts
  ```

- [ ] **Step 4.7 — Run all tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 4.8 — Commit**

  ```bash
  git add scripts/release/release-plan.ts scripts/do-release.ts package.json test/infra/release-plan.test.ts
  git commit -m "feat: add readCommitsSinceTag and do-release script for auto release-on-push"
  ```

---

## Task 5 — Rewrite `.github/workflows/release.yml`

**File:** `.github/workflows/release.yml` — full rewrite

The new workflow has **one job**: `release`.

Gate logic (inline at the top of the job):
- If the HEAD commit subject starts with `chore(release):` → skip (the bot already cut the release; this push is the version-bump commit, prevent infinite loop).
- Otherwise run `do-release.ts`. If it reports `changed: false` → skip publish. If `changed: true` → commit, tag, publish, create GitHub release.

- [ ] **Step 5.1 — Write the new `release.yml`**

  ```yaml
  name: Release

  on:
    push:
      branches:
        - main
    workflow_dispatch:

  permissions:
    contents: write
    id-token: write

  jobs:
    release:
      runs-on: ubuntu-latest
      timeout-minutes: 20
      steps:
        - name: Checkout
          uses: actions/checkout@v6
          with:
            fetch-depth: 0

        - name: Skip if this is a release commit
          id: guard
          run: |
            subject=$(git log -1 --pretty=format:"%s")
            if echo "$subject" | grep -qE "^chore\(release\):"; then
              echo "skip=true" >> "$GITHUB_OUTPUT"
            else
              echo "skip=false" >> "$GITHUB_OUTPUT"
            fi

        - name: Setup Bun
          if: steps.guard.outputs.skip == 'false'
          uses: oven-sh/setup-bun@v2
          with:
            bun-version: 1.3.11

        - name: Setup Node
          if: steps.guard.outputs.skip == 'false'
          uses: actions/setup-node@v6
          with:
            node-version: 24
            registry-url: https://registry.npmjs.org

        - name: Install dependencies
          if: steps.guard.outputs.skip == 'false'
          run: bun install --frozen-lockfile

        - name: Build
          if: steps.guard.outputs.skip == 'false'
          run: bun run build

        - name: Run tests
          if: steps.guard.outputs.skip == 'false'
          run: bunx vitest run

        - name: Prepare release
          if: steps.guard.outputs.skip == 'false'
          id: prepare
          run: |
            result=$(bun run release:do)
            echo "result=$result" >> "$GITHUB_OUTPUT"
            changed=$(echo "$result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).changed.toString())")
            version=$(echo "$result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version ?? '')")
            echo "changed=$changed" >> "$GITHUB_OUTPUT"
            echo "version=$version" >> "$GITHUB_OUTPUT"

        - name: Commit and tag release
          if: steps.guard.outputs.skip == 'false' && steps.prepare.outputs.changed == 'true'
          env:
            GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          run: |
            version="${{ steps.prepare.outputs.version }}"
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add package.json CHANGELOG.md
            git commit -m "chore(release): v${version} [skip ci]"
            git tag "v${version}"
            git push origin main
            git push origin "v${version}"

        - name: Publish to npm
          if: steps.guard.outputs.skip == 'false' && steps.prepare.outputs.changed == 'true'
          env:
            NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          run: bun run release:publish

        - name: Create GitHub release
          if: steps.guard.outputs.skip == 'false' && steps.prepare.outputs.changed == 'true'
          env:
            GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          run: |
            version="${{ steps.prepare.outputs.version }}"
            tag="v${version}"
            node - <<'NODE' > release-notes.md
            const fs = require('node:fs');
            const version = require('./package.json').version;
            const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
            const escaped = version.replace(/\./g, '\\.');
            const match = changelog.match(new RegExp(`## \\[${escaped}\\] - .*?(?=\\n## \\[|$)`, 's'));
            process.stdout.write((match?.[0] ?? `Release ${version}`).trim() + '\n');
            NODE
            gh release create "$tag" --title "$tag" --notes-file release-notes.md
  ```

  > **Note:** `[skip ci]` in the commit message tells GitHub Actions to skip workflows for that push, which also prevents the infinite loop as a belt-and-suspenders measure alongside the `guard` step.

- [ ] **Step 5.2 — Remove the old `prepare_release_pr` and `publish_release` jobs**

  The file above replaces the entire `release.yml`. Confirm no references to `release/next`, `release-plan.json`, `RELEASE_PR_TITLE`, or `RELEASE_PR_BODY` remain.

- [ ] **Step 5.3 — Commit**

  ```bash
  git add .github/workflows/release.yml
  git commit -m "feat: replace two-PR release dance with release-on-push-to-main workflow"
  ```

---

## Task 6 — End-to-End Verification

- [ ] **Step 6.1 — Full local build and test**

  ```bash
  bun run build && bunx vitest run
  ```
  Expected: clean build, all tests green.

- [ ] **Step 6.2 — Smoke-test the binary**

  ```bash
  node dist/cli.js &
  sleep 1
  kill %1
  ```
  Expected: MCP stdio loop starts; no editor opens.

- [ ] **Step 6.3 — Dry-run the release script**

  ```bash
  bun run release:do
  ```
  Expected: prints `{ "changed": true, "version": "X.Y.Z" }` (or `changed: false` if no releasable commits), and `package.json` / `CHANGELOG.md` are updated on disk.

  Reset the files after:
  ```bash
  git checkout -- package.json CHANGELOG.md
  ```

- [ ] **Step 6.4 — Final cleanup commit if needed**

  ```bash
  git add -p
  git commit -m "fix: post-review cleanup"
  ```
