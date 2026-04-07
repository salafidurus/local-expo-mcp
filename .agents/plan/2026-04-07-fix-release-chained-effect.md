# Fix Release Workflow Chained Effect

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the release workflow so that a single push to main produces a complete release — no staging PR, no second manual merge, no chained workflow runs.

**Only file to change:** `.github/workflows/release.yml`

---

## Problem Description

### What was agreed (Option A)

Every push to `main` containing a releasable commit (`feat:`, `fix:`, breaking change) should:
1. Bump `package.json` version
2. Update `CHANGELOG.md`
3. Commit those two files back to `main` with `[skip ci]` to prevent re-triggering
4. Tag the commit
5. Publish to npm
6. Create a GitHub release

One push → one workflow run → done. No human steps between push and publish.

### What was actually implemented

The workflow still uses the **old two-PR dance**, just with newer scripts driving it:

```
Feature PR merged to main
        │
        ▼
Workflow fires — mode = "prepare"
        │
        ▼
do-release.ts bumps version, updates CHANGELOG
        │
        ▼
Workflow creates/updates release/next branch + opens PR
        │
        ▼  ← HUMAN must manually merge this PR
release/next PR merged to main
        │
        ▼
Workflow fires again — mode = "publish" (detects "chore(release):" subject)
        │
        ▼
npm publish + git tag + GitHub release
```

This is two GitHub Actions runs, two commits to main, and a required human action between them. The "chained effect" is the cascade: every feature push spawns a PR that must be merged before anything ships.

### Root cause in the code

The guard in `Determine mode` routes to either `prepare` **or** `publish`, but never combines them:

```yaml
- name: Determine mode
  id: guard
  run: |
    subject=$(git log -1 --pretty=format:"%s")
    if echo "$subject" | grep -qE "^chore\(release\):"; then
      echo "mode=publish" >> "$GITHUB_OUTPUT"   # ← second run
    else
      echo "mode=prepare" >> "$GITHUB_OUTPUT"   # ← first run, stops here
    fi
```

The `Create or update release PR` step (lines 71–92) then pushes to `release/next` and opens a PR instead of committing directly to `main` and publishing immediately.

The `Publish to npm`, `Create release tag`, and `Create GitHub release` steps are gated on `mode == 'publish'` — meaning they **never run** in the same workflow run as prepare.

### Secondary problem — `[skip ci]` is missing

The release commit (`chore(release): v0.x.x`) pushed to `release/next` does **not** contain `[skip ci]`. When that branch is later merged to `main`, the merge commit triggers another full workflow run. Without `[skip ci]`, the only protection against an infinite loop is the `mode` guard detecting the `chore(release):` prefix — but that only works if GitHub uses a squash merge. A regular merge produces a commit subject like `Merge pull request #N from release/next`, which does **not** match the guard, causing `mode=prepare` to fire again and creating another `release/next` PR.

---

## Solution

Collapse both modes into a single pass. When `do-release.ts` reports `changed=true`:
1. Commit `package.json` + `CHANGELOG.md` directly to `main` with message `chore(release): vX.Y.Z [skip ci]`
2. Push the tag
3. Publish to npm
4. Create the GitHub release

All in the same workflow run. No `release/next` branch. No second run needed.

The guard becomes a pure skip-guard: if HEAD is already a release commit, bail out entirely. The `[skip ci]` in the commit message is belt-and-suspenders — GitHub Actions won't even queue a run for that push.

### New workflow flow

```
Feature PR merged to main
        │
        ▼
Workflow fires
        │
        ▼
Guard: is HEAD subject "chore(release):"? → YES → skip all steps, done
                                          → NO  ↓
        ▼
Install, build, test
        │
        ▼
bun run release:do
  → no releasable commits? → write changed=false → done (no publish)
  → releasable commits?    → bump package.json, update CHANGELOG
                              write changed=true + version
        │
        ▼ (only if changed=true)
git commit "chore(release): vX.Y.Z [skip ci]"
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
        │
        ▼
npm publish
        │
        ▼
gh release create vX.Y.Z
        │
        ▼
DONE — one run, no human steps
```

---

## Implementation Steps

**Only file to edit:** `.github/workflows/release.yml`

- [ ] **Step 1 — Remove `pull-requests: write` permission**

  It is only needed to open PRs. With no `release/next` PR, it is unnecessary.

  ```yaml
  # Remove this line:
  pull-requests: write
  ```

- [ ] **Step 2 — Replace the `Determine mode` step with a simple skip guard**

  The current step sets `mode=prepare` or `mode=publish`. Replace it so it only decides whether to skip:

  ```yaml
  - name: Skip if this is a release commit
    id: guard
    run: |
      subject=$(git log -1 --pretty=format:"%s")
      if echo "$subject" | grep -qE "^chore\(release\):"; then
        echo "skip=true" >> "$GITHUB_OUTPUT"
      else
        echo "skip=false" >> "$GITHUB_OUTPUT"
      fi
  ```

- [ ] **Step 3 — Change all step conditions from `mode` to `skip`**

  Every step that currently checks `steps.guard.outputs.mode == 'prepare' || steps.guard.outputs.mode == 'publish'` should become:

  ```yaml
  if: steps.guard.outputs.skip == 'false'
  ```

  This applies to: Setup Bun, Setup Node, Install dependencies, Build, Run tests.

- [ ] **Step 4 — Simplify the `Prepare release` step**

  Remove the stale `echo "result=$result"` line (it writes the full JSON to the outputs file which is unnecessary):

  ```yaml
  - name: Prepare release
    if: steps.guard.outputs.skip == 'false'
    id: prepare
    run: |
      result=$(bun run release:do)
      changed=$(echo "$result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).changed.toString())")
      version=$(echo "$result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version ?? '')")
      echo "changed=$changed" >> "$GITHUB_OUTPUT"
      echo "version=$version" >> "$GITHUB_OUTPUT"
  ```

- [ ] **Step 5 — Replace `Create or update release PR` with `Commit, tag, and push`**

  Delete the entire `Create or update release PR` step (lines 71–92 in the current file) and replace it with:

  ```yaml
  - name: Commit, tag, and push
    if: steps.guard.outputs.skip == 'false' && steps.prepare.outputs.changed == 'true'
    run: |
      version="${{ steps.prepare.outputs.version }}"
      git config user.name "github-actions[bot]"
      git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
      git add package.json CHANGELOG.md
      git commit -m "chore(release): v${version} [skip ci]"
      git tag "v${version}"
      git push origin main
      git push origin "v${version}"
  ```

  Key differences from the deleted step:
  - No `git checkout -B release/next` — stays on `main`
  - No `gh pr create` / `gh pr edit` — no PR
  - `[skip ci]` in the commit message — prevents the push back to `main` from triggering another run
  - Pushes the tag in the same step

- [ ] **Step 6 — Collapse publish and GitHub release into one condition**

  Delete the separate `Publish to npm`, `Create release tag`, and `Create GitHub release` steps.

  Replace them with:

  ```yaml
  - name: Publish to npm
    if: steps.guard.outputs.skip == 'false' && steps.prepare.outputs.changed == 'true'
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    run: bun run release:publish

  - name: Create GitHub release
    if: steps.guard.outputs.skip == 'false' && steps.prepare.outputs.changed == 'true'
    env:
      GH_TOKEN: ${{ secrets.SALAFIDURUS_PR_WRITE }}
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

  Note: The `Create release tag` step is removed because the tag is now pushed in `Commit, tag, and push`.

- [ ] **Step 7 — Verify the final file structure**

  After the edit, the workflow should have exactly these steps in order, with no others:

  1. `Checkout`
  2. `Skip if this is a release commit` (id: guard)
  3. `Setup Bun` (if: skip == 'false')
  4. `Setup Node` (if: skip == 'false')
  5. `Install dependencies` (if: skip == 'false')
  6. `Build` (if: skip == 'false')
  7. `Run tests` (if: skip == 'false')
  8. `Prepare release` (if: skip == 'false', id: prepare)
  9. `Commit, tag, and push` (if: skip == 'false' && changed == 'true')
  10. `Publish to npm` (if: skip == 'false' && changed == 'true')
  11. `Create GitHub release` (if: skip == 'false' && changed == 'true')

  Permissions block should only contain:
  ```yaml
  permissions:
    contents: write
    id-token: write
  ```

- [ ] **Step 8 — Validate by reading the final file**

  Check that none of these strings remain in the file:
  - `mode=publish`
  - `mode=prepare`
  - `release/next`
  - `gh pr create`
  - `gh pr edit`
  - `gh pr list`
  - `pull-requests: write`
  - `Create release tag` (step name)

---

## Expected Final `release.yml`

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
          token: ${{ secrets.SALAFIDURUS_PR_WRITE }}

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
          changed=$(echo "$result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).changed.toString())")
          version=$(echo "$result" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version ?? '')")
          echo "changed=$changed" >> "$GITHUB_OUTPUT"
          echo "version=$version" >> "$GITHUB_OUTPUT"

      - name: Commit, tag, and push
        if: steps.guard.outputs.skip == 'false' && steps.prepare.outputs.changed == 'true'
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
          GH_TOKEN: ${{ secrets.SALAFIDURUS_PR_WRITE }}
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
