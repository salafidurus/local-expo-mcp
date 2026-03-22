# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.
This project aims to follow Semantic Versioning once the package is ready for public release.

## [Unreleased]

### Added
- Bun-based local development, test, and CI workflow.
- Initial MCP orchestration scaffolding for Metro, hidden `expo-mcp`, Android runs, `adb` fallback device operations, hidden `mobile-mcp` screenshots, and session summaries.
- Unit and integration test coverage for the current Windows and Android-first scope.
- Installed-package bin resolution for hidden MCP child processes.
- Real runtime integrations for Expo CLI, `adb`, hidden `expo-mcp`, hidden `mobile-mcp`, and server bootstrap wiring.
- Fixture-backed Metro parser coverage for module resolution, TypeScript, and Babel parse failures.
- Required live smoke tests for active Android and Metro workflows.
- Repo-owned live Expo project scaffolding for passing and broken Metro reproduction cases.
- Repository automation for Dependabot, CI, release packaging, and a maintained changelog.
- README, MIT license, and third-party notices.

### Changed
- Pinned `mobile-mcp` to a specific version so dependency updates are explicit and testable.
- Switched the runtime and development workflow to Bun-oriented commands.
- Split the default test suite from the live test suite and added `test:acceptance`.
- Default live Metro smoke now targets the repo-owned passing Expo app unless overridden.

## [0.1.0] - TBD

### Added
- Initial project scaffold.
