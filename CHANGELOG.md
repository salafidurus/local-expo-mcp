# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Shebang line to entry point for reliable `npx` execution on Windows.
- Standardized agent plans in `.agents/plan` with metadata and status tracking.
- CLI-based setup instructions for Codex, Gemini, and OpenCode in README.
- Robust UI hierarchy parsing using `fast-xml-parser` for `mobile-mcp` integration.
- Troubleshooting guidance for ADB device states (`unauthorized`, `offline`, `recovery`).
- Metro readiness detection using the `/status` endpoint to distinguish from port conflicts.

### Fixed
- Critical memory leak in `LockManager` where project-specific queues were never deleted.
- Indefinite hangs during process termination by implementing a 5s grace period with fallback `SIGKILL` (Unix) or `taskkill` (Windows).
- Windows command spawning bug when binary paths or arguments contain spaces.
- High memory pressure when reading ADB logs by using the `-t` flag for `logcat`.

## [0.2.0] - 2026-03-22

### Added
- Expanded `mobile-mcp` tool forwarding for richer device interaction.
- Pinned `mobile-mcp` dependency version for better stability.
- Acceptance test suite (`test:acceptance`) covering unified Windows/Unix scenarios.

### Fixed
- Release workflow dependency on specific GitHub labels.
- Metro log classification for better diagnostic clarity.

## [0.1.0] - 2026-03-21

### Added
- Initial project scaffold with Bun-based development workflow.
- Core MCP orchestration for Metro, `expo-mcp`, and Android runs.
- Unit and integration test coverage for core integration layers.
- GitHub Actions CI and PR-based release automation.
- Project inspection and session summary tools.
