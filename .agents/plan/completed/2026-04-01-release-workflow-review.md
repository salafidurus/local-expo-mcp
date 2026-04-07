# Release Workflow Review Plan

## Issue Description
The prepare release PR content seems to be doing something incorrectly.

## Analysis Summary

### Current Flow
1. When a PR with "publish" label is merged to main, the gate job extracts PR title and body
2. The title and body are passed to `create-release-pr.ts` via environment variables
3. The script calls `analyzeReleasePlan()` with subject (title) and body
4. Release notes are generated based on commit type (feat:, fix:, etc.) and breaking change detection

### Identified Issues

#### Issue 1: PR Body Content Not Fully Utilized
**Location**: `scripts/release/release-plan.ts:34-63`

The PR body is passed to `analyzeReleasePlan()` but is ONLY used for breaking change detection:
```typescript
const breaking = isBreakingChange(commit);  // line 36
```

The body content is not used to augment release notes. If PRs contain important details in the body (beyond the title), those details are lost in the generated release notes.

**Impact**: Release PR content may be incomplete if users rely on body text for additional context.

#### Issue 2: Recent Change Removed Manual Notes Handling
**Location**: `scripts/release/release-pr.ts:44-70`

Commit `6678722` removed the ability to manually add notes to CHANGELOG.md before release. Previously, the code looked for `## [Unreleased]` section and consumed manual notes from there. This functionality was removed.

**Impact**: No way to add custom release notes beyond conventional commit parsing.

#### Issue 3: Potential Escaping Issue with Multiline Body
**Location**: `.github/workflows/release.yml:48`

```yaml
pr_body=$(echo "$prs" | jq -r '... | .[0].body // ""')
```

If the PR body contains special JSON characters, there could be escaping issues when passing through environment variables to the next job.

## Proposed Fixes

### Fix 1: Parse PR Body for Additional Content
Enhance `analyzeReleasePlan()` to extract meaningful content from the PR body:
- Parse body for scope information (e.g., `chore(api): message`)
- Include body text as supplementary notes when subject is too short
- Extract any bullet points or structured content from body

### Fix 2: Add Body Content to Release Notes
Modify `renderReleasePrBody()` to optionally include original PR body content as supplementary notes, giving users more control over what's included.

### Fix 3: Verify Escaping
Test the workflow with PRs containing special characters in body to verify proper handling.

## Implementation Steps

1. **Write tests** for edge cases in release-pr.ts (multiline body, special characters, empty body)
2. **Modify** `analyzeReleasePlan()` to utilize body content for release notes
3. **Update** `renderReleasePrBody()` to include original body as supplementary content
4. **Run tests** to verify fixes don't break existing functionality
5. **Test manually** with sample PRs to verify behavior

## Files to Modify
- `scripts/release/release-plan.ts` - Enhance body parsing
- `scripts/release/release-pr.ts` - Update PR body rendering
- `test/infra/release-pr.test.ts` - Add edge case tests
- `test/infra/release-plan.test.ts` - Add body parsing tests