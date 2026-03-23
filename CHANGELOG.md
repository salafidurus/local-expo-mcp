# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Shebang line to `src/server.ts` for reliable `npx` execution on Windows.
- Standardized agent plans in `.agents/plan` with metadata and status tracking.
- CLI-based setup instructions for Codex, Gemini, and OpenCode in README.
- Robust UI hierarchy parsing using `fast-xml-parser` for `mobile-mcp` integration.
- Troubleshooting guidance for ADB device states (`unauthorized`, `offline`, `recovery`).
- Metro readiness detection using the `/status` endpoint to distinguish from port conflicts.
- Infrastructure tests in `test/infra/build-output.test.ts` to verify the presence of the shebang.

### Fixed
- Critical memory leak in `LockManager` where project-specific queues were never deleted.
- Indefinite hangs during process termination by implementing a 5s grace period with fallback `SIGKILL` (Unix) or `taskkill` (Windows).
- Windows command spawning bug when binary paths or arguments contain spaces.
- High memory pressure when reading ADB logs by using the `-t` flag for `logcat`.

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
