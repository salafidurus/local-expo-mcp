# Release And Publishing

## Commit Messages

CI enforces Conventional Commits through `commitlint`.

Use examples like:
- `feat: add new device tool`
- `fix: recover from stale mobile-mcp child`
- `docs: expand README client setup`
- `chore: update pinned dependency`

## Publishing Model

Current release behavior:
- semantic-release computes the version and changelog
- PRs merged with the `publish` label are publishable through the release workflow
- stale publish automation can publish if the package has not been published in 7 days and a release is pending

## Files

Important release files:
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.github/workflows/stale-publish.yml`
- `.releaserc.json`
- [CHANGELOG.md](../../CHANGELOG.md)
- `package.json`

## Secrets

Required for npm publishing:
- `NPM_TOKEN`

## Rule

When changing release automation, update tests that cover workflow files and package metadata.
