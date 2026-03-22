# `release/next` Branch Protection Plan

## Purpose

This plan covers the deferred hardening work for the automation-owned `release/next` branch.

It exists to:

- reserve `release/next` as a dedicated automation branch
- prevent accidental deletion or casual human reuse of that branch name
- preserve the current release workflow requirement that GitHub Actions can force-update the branch

## Goal

Add a light protection or ruleset configuration for `release/next` that:

- keeps `main` as the real review gate
- prevents accidental deletion of `release/next`
- prevents ad hoc manual use of `release/next` as a normal feature branch
- still allows the release workflow to create, reset, and force-push `release/next`

## Non-Goals

This plan does not aim to:

- make `release/next` as strictly protected as `main`
- require pull requests for updates to `release/next`
- require status checks on `release/next`
- block the release workflow from rewriting the branch

## Constraints

The current release workflow in [release.yml](../../.github/workflows/release.yml):

- creates or resets `release/next`
- commits version and changelog updates there
- uses `git push --force-with-lease origin release/next`

So any protection that blocks force-push or GitHub Actions writes will break releases.

## Desired Rule Shape

Preferred end state:

- branch name `release/next` is explicitly reserved
- deletion is blocked
- direct human pushes are restricted if GitHub rules allow actor scoping
- GitHub Actions is allowed to update the branch
- force-push remains allowed for the release workflow path
- no required pull request rule on `release/next`
- no required status checks on `release/next`

Fallback acceptable state:

- branch deletion is blocked
- branch name is reserved
- force-push remains allowed
- human pushes are still possible, but contributors are instructed not to use the branch manually

## Delivery Method

Use documentation-first validation because this is repo administration work, not runtime product code.

Suggested loop:

1. document the intended GitHub rule shape
2. confirm the workflow behaviors that require force-push and automation writes
3. add repo guidance describing the safe `release/next` settings
4. apply the GitHub branch rule or ruleset manually
5. run one release-PR cycle to verify the workflow still updates `release/next`

## Implementation Steps

### Phase 1: Document The Rule

Tasks:

- add a short note to [README.md](../../README.md) or [AGENT.md](../../AGENT.md) explaining that `release/next` is automation-owned
- document that `main` is the review gate and `release/next` must remain force-updatable by the workflow
- document that deletion protection is preferred

Exit criteria:

- contributors can see that `release/next` is not a normal working branch

### Phase 2: Apply GitHub Settings

Tasks:

- create a branch protection rule or ruleset for `release/next`
- disable branch deletion
- keep force-push allowed for the workflow path
- avoid PR and required-check requirements on `release/next`
- if possible, restrict direct pushes to GitHub Actions only

Exit criteria:

- `release/next` cannot be casually deleted or repurposed
- the release workflow still has the permissions it needs

### Phase 3: Verify Release Automation

Tasks:

- merge a `publish`-labeled PR into `main`
- confirm the workflow updates or recreates `release/next`
- confirm the release PR is created or updated successfully
- merge the release PR and confirm publish still works

Exit criteria:

- branch protection hardening does not break the release flow

## Risks

- blocking force-push would break the current workflow immediately
- requiring PRs on `release/next` would create a recursive release workflow problem
- required checks on `release/next` add friction without increasing real safety because `main` is the actual merge gate

## Definition Of Done

This plan is complete when:

- `release/next` has a light protection rule or ruleset
- the branch cannot be accidentally deleted
- the release workflow can still force-update the branch
- repo docs explain that `release/next` is automation-owned
