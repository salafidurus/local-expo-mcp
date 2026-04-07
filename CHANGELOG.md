# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Stage custom release notes here. They will be merged with commit-derived notes on the next release. -->

## [0.2.0] - 2026-03-22

### Added
- Initial MCP orchestration scaffolding for Metro, hidden `expo-mcp`, Android runs, `adb` fallback device operations, hidden `mobile-mcp` screenshots, and session summaries.
- Unit and integration test coverage for the current Windows and Android-first scope.
- Installed-package bin resolution for hidden MCP child processes.
- Real runtime integrations for Expo CLI, `adb`, hidden `expo-mcp`, hidden `mobile-mcp`, and server bootstrap wiring.
- Fixture-backed Metro parser coverage for module resolution, TypeScript, and Babel parse failures.
- Required live smoke tests for active Android and Metro workflows.
- Repo-owned live Expo project scaffolding for passing and broken Metro reproduction cases.
- Repository automation for Dependabot, CI, release packaging, and a maintained changelog.
- Expanded mobile MCP forwarding.

### Changed
- Pinned `mobile-mcp` to a specific version so dependency updates are explicit and testable.
- Switched the runtime and development workflow to Bun-oriented commands.
- Split the default test suite from the live test suite and added `test:acceptance`.
- Default live Metro smoke now targets the repo-owned passing Expo app unless overridden.

### Fixed
- Removed release label dependency in CI workflow.

## [0.1.0] - 2026-03-21

### Added
- Initial project scaffold.
