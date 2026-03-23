# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-03-22

### Added
- Added `#!/usr/bin/env node` shebang to `src/server.ts` to ensure correct execution via `npx` on Windows.
- Added infrastructure tests to verify the shebang and build output integrity.
- Added CLI command examples for Codex, Gemini, and OpenCode to the README.
- Integrated `fast-xml-parser` for robust, hierarchical mobile UI parsing, replacing fragile regex-based logic.
- Improved Metro readiness detection by specifically polling the `/status` endpoint to distinguish between Metro and other processes.
- Enriched ADB device states (`unauthorized`, `offline`, `recovery`, `sideload`) with specific troubleshooting guidance.
- Added metadata and progress tracking to internal agent plans in `.agents/plan`.
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
- Switched the runtime and development workflow to Bun-oriented commands.
- Pinned `mobile-mcp` to a specific version so dependency updates are explicit and testable.
- Split the default test suite from the live test suite and added `test:acceptance`.
- Default live Metro smoke now targets the repo-owned passing Expo app unless overridden.

### Fixed
- Implemented atomic cleanup in `LockManager` to fix a persistent memory leak where project-specific locks were never removed.
- Implemented a 5-second termination grace period with `SIGKILL` (Unix) and `taskkill /F` (Windows) fallbacks to prevent zombie processes.
- Fixed robust Windows command spawning to correctly handle binary paths and arguments containing spaces.
- Optimized `adb logcat` memory usage by using the `-t` flag to limit initial buffer reads.
- Removed release label dependency in CI workflow.

## [0.1.0] - 2026-03-21

### Added
- Initial project scaffold.
