# `local-expo-mcp` macOS Implementation Plan

## Status

Deferred.

## Reason

- current development environment is Windows
- no macOS runtime or simulator access is available
- macOS implementation and macOS-specific tests should not block Windows development delivery
- Linux has not been validated yet and is out of scope for this deferred plan

## Deferred Scope

- `ios_run`
- `src/parsers/xcode-parser.ts`
- `src/integrations/ios-sim.ts`
- iOS parser fixtures
- iOS integration tests
- macOS-only live tests

## Rules For When macOS Work Resumes

- continue using strict TDD
- start with non-macOS guard tests first
- then add fixture-driven Xcode parser tests
- then add macOS-gated implementation and integration tests
- keep all macOS live tests explicit and platform-gated

## Detailed Future Plan

### Phase M1: Platform Guard First

Objectives:

- establish correct non-macOS behavior before any macOS-specific implementation begins

Tests first:

- failing tests for `IOS_UNSUPPORTED_ON_THIS_PLATFORM` on non-macOS

Acceptance detail:

- `ios_run` returns a typed unsupported-platform envelope on Windows and Linux
- unsupported behavior is covered before any Xcode or simulator logic is introduced

### Phase M2: Xcode Parser

Objectives:

- implement fixture-driven Xcode output classification without needing a live macOS environment initially

Tests first:

- `xcode-parser.test.ts`
- `xcode-failure.txt` fixture coverage

Minimum classifications:

- signing failure
- xcodebuild compile failure
- simulator boot failure when visible in logs
- CocoaPods-related failure when visible in logs

Acceptance detail:

- parser results include `type`, `message`, optional location fields, and non-empty `suggestedFixes`

### Phase M3: iOS Run Tool

Objectives:

- implement `ios_run` with platform guard and structured lifecycle state

Tests first:

- non-macOS guard tests
- macOS-gated fake integration tests where practical

Acceptance detail:

- local iOS run is only enabled on macOS
- result envelopes mirror Android structure where reasonable
- child process output is parsed into structured phase and summary fields rather than exposed as raw terminal output

### Phase M4: Simulator Integration

Objectives:

- implement `ios-sim.ts` only when concrete simulator interaction is needed by a user-facing tool

Tests first:

- write targeted tests for the specific simulator behavior needed
- avoid speculative simulator abstraction before a clear use case exists

Acceptance detail:

- simulator-specific logic remains isolated from the rest of the orchestrator
- no simulator feature is added without a direct tool requirement

### Phase M5: macOS Live Tests

Objectives:

- add optional live iOS verification once a macOS environment is available

Rules:

- gate all live macOS tests behind explicit env vars
- do not make CI depend on simulator presence
- do not make default `bunx vitest run` depend on macOS

Suggested env gates:

- `LIVE_MAC_TESTS=1`
- optional simulator-specific gate if needed later

## Contracts To Preserve When Resuming macOS Work

- use the same error envelope structure as Windows and Metro tools
- use centralized stable error codes
- keep macOS session state project-scoped and compatible with `session_summary`
- preserve the single public MCP server model
- never allow macOS-specific failures to crash the main MCP server

## Minimum Future Checklist

1. Write failing tests for `IOS_UNSUPPORTED_ON_THIS_PLATFORM` on non-macOS.
2. Add `xcode-failure.txt` fixture and failing parser tests.
3. Implement `xcode-parser.ts`.
4. Implement `ios_run` with platform guard and structured failures.
5. Implement `ios-sim.ts` only when a concrete simulator interaction is needed.
6. Add macOS-only integration coverage behind explicit env flags.

## Current Release Rule

Until macOS work resumes, all active implementation and release gates are Windows-first.
