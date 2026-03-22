# `local-expo-mcp` Project Init Plan

## Purpose

This is the master plan for bootstrapping `local-expo-mcp` as a single public MCP server for local Expo workflows.

It exists to:

- define the overall architecture and delivery sequence
- lock the stable contracts before implementation drifts
- split active Windows development work from deferred macOS work
- make TDD the mandatory execution model

## Project Goal

Build a single user-visible MCP server that:

- exposes workflow-oriented tools over STDIO
- manages Expo CLI directly for Metro and local native runs
- lazily starts hidden child MCPs for `expo-mcp` and `mobile-mcp`
- keeps the main server alive when hidden integrations fail
- returns structured tool responses instead of raw terminal output
- ships with deterministic unit, integration, and live tests

## Current Platform Scope

Current active scope is Windows-first.

Implications:

- the active implementation target is the Windows development environment
- Metro, local Expo development workflows, and Android-capable local flows are in active scope
- macOS-specific work is deferred into a separate plan
- Linux has not been validated yet and should be treated as untested
- default non-live tests must pass on Windows
- Windows-specific and Windows-live suites are first-class validation gates

Plan split:

- this file is the master architectural and delivery reference
- [1-project-init-implementation-windows.md](1-project-init-implementation-windows.md) is the active detailed implementation plan
- [1-project-init-implementation-mac.md](1-project-init-implementation-mac.md) is the deferred macOS plan

## Delivery Method

Use strict TDD for all implementation work.

Required loop:

1. write or extend a focused test
2. run it and confirm it fails for the expected reason
3. implement the smallest code change needed to pass it
4. rerun the focused test
5. rerun the broader relevant suite
6. only then mark the task done

Rules:

- a task is not complete if the intended new test was never observed failing first
- if behavior is hard to test, create the seam or abstraction needed to test it before implementing the behavior itself
- prefer unit tests for pure logic and integration tests with fakes for orchestration, child processes, and MCP interactions
- do not treat “code compiles” as proof that the task is done

## Non-Goals

This project intentionally does not include:

- EAS workflows
- cloud-based build or deployment orchestration
- requiring users to install or configure `expo-mcp` separately
- requiring users to install or configure `mobile-mcp` separately
- forking `expo-mcp` or `mobile-mcp`
- assuming Linux parity before Linux has been tested

## Repository Shape

Keep the v1 repository structure flat and explicit.

Rationale:

- the tool count is still small enough that flat files are easier to navigate
- the original spec already defines a stable top-level layout
- deeper nesting should wait until file count or team ownership requires it

Required structure:

```text
local-expo-mcp/
  package.json
  tsconfig.json
  README.md
  LICENSE
  THIRD_PARTY_NOTICES.md
  .gitignore

  src/
    server.ts
    config.ts
    types.ts
    app-context.ts
    locks.ts

    mcp/
      tool-registry.ts
      schemas.ts
      responses.ts

    state/
      session-store.ts
      process-store.ts
      log-store.ts

    tools/
      project-inspect.ts
      metro-start.ts
      metro-stop.ts
      metro-restart.ts
      metro-status.ts
      metro-logs-recent.ts
      metro-errors-recent.ts
      dev-server-attach.ts
      android-run.ts
      ios-run.ts
      device-list.ts
      device-logs-recent.ts
      device-screenshot.ts
      session-summary.ts

    integrations/
      expo-cli.ts
      expo-mcp-client.ts
      mobile-mcp-client.ts
      adb.ts
      ios-sim.ts

    parsers/
      metro-parser.ts
      gradle-parser.ts
      xcode-parser.ts

    utils/
      spawn.ts
      ring-buffer.ts
      fs.ts
      paths.ts
      logger.ts
      errors.ts
      polling.ts

  test/
    unit/
      ring-buffer.test.ts
      metro-parser.test.ts
      gradle-parser.test.ts
      xcode-parser.test.ts
      project-inspect.test.ts
      process-store.test.ts
      log-store.test.ts

    integration/
      metro-start-stop.test.ts
      metro-log-capture.test.ts
      dev-server-attach.test.ts
      android-run-mock.test.ts
      device-screenshot-mock.test.ts
      session-summary.test.ts

    fixtures/
      expo-project-basic/
        package.json
        app.json
        App.tsx
      logs/
        metro-module-resolution.txt
        metro-typescript.txt
        metro-babel.txt
        gradle-failure.txt
        xcode-failure.txt

    helpers/
      fake-child-process.ts
      fake-mcp-server.ts
      temp-project.ts
```

## Architecture

### Public and Hidden Layers

The project has one public MCP surface and multiple internal execution layers.

Public layer:

- `local-expo-mcp` is the only server users configure in `.codex/config.toml`

Direct local execution layer:

- Expo CLI for Metro and local native development flows
- filesystem inspection for project detection
- `adb` fallback behavior for Android device listing and logs
- in-memory state for processes, sessions, and logs

Hidden MCP child layer:

- `expo-mcp` for optional Expo-specific functionality after Metro is healthy
- `mobile-mcp` for optional richer device behavior, especially screenshots

### App Context

Implement the server around one explicit runtime container.

Recommended shape:

```ts
type AppContext = {
  config: AppConfig;
  clock: () => number;
  logger: Logger;
  processStore: ProcessStore;
  sessionStore: SessionStore;
  logStore: LogStore;
  spawn: SpawnFacade;
  locks: LockManager;
  integrations: {
    expoCli: ExpoCliIntegration;
    expoMcp: ExpoMcpClientManager;
    mobileMcp: MobileMcpClientManager;
    adb: AdbIntegration;
    iosSim: IosSimIntegration;
  };
};
```

### Wiring Rules

- `src/server.ts` creates one `AppContext`
- `src/mcp/tool-registry.ts` registers handlers by passing `AppContext` into each tool factory
- each tool module exports a factory rather than relying on module-global mutable state
- stores and integrations must be replaceable in tests

### Session Model

Use project-scoped sessions keyed by normalized `projectRoot`.

Rules:

- one process may hold multiple project sessions in memory
- each project has at most one active Metro process
- each project has at most one active `expo-mcp` attachment
- each project has at most one active Android-capable local run
- macOS session fields may exist in shared types but remain inactive on Windows
- `mobile-mcp` must be modeled explicitly as either global or per-project

### Public Contract

The stable public contract consists of:

- tool names
- input schemas
- success envelopes
- failure envelopes
- stable error codes

These should be centralized before implementation expands so tests and behavior can align early.

## Response and Error Contract

### Success Envelope

```json
{ "ok": true, "...": "tool-specific fields" }
```

### Failure Envelope

```json
{
  "ok": false,
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Human-readable summary",
    "details": {}
  }
}
```

### Baseline Error Codes

Generic:

- `INVALID_INPUT`
- `PROJECT_NOT_FOUND`
- `PROJECT_NOT_EXPO`
- `UNSUPPORTED_PLATFORM`
- `TIMEOUT`
- `PROCESS_START_FAILED`
- `PROCESS_EXITED_EARLY`
- `PROCESS_NOT_RUNNING`
- `PROCESS_ALREADY_RUNNING`
- `INTERNAL_STATE_ERROR`

Metro:

- `METRO_START_TIMEOUT`
- `METRO_START_FAILED`
- `METRO_NOT_RUNNING`
- `METRO_URL_NOT_DETECTED`
- `METRO_LOG_UNAVAILABLE`
- `METRO_PARSE_FAILED`

Child MCP:

- `EXPO_MCP_EXECUTABLE_NOT_FOUND`
- `EXPO_MCP_ATTACH_FAILED`
- `EXPO_MCP_NOT_ATTACHED`
- `MOBILE_MCP_EXECUTABLE_NOT_FOUND`
- `MOBILE_MCP_ATTACH_FAILED`
- `MOBILE_MCP_NOT_ATTACHED`
- `CHILD_MCP_EXITED`

Android:

- `ANDROID_RUN_TIMEOUT`
- `ANDROID_RUN_ALREADY_ACTIVE`
- `ANDROID_BUILD_FAILED`
- `ADB_NOT_FOUND`
- `ADB_COMMAND_FAILED`
- `ANDROID_DEVICE_UNAVAILABLE`
- `ANDROID_SCREENSHOT_UNSUPPORTED`

macOS future baseline:

- `IOS_UNSUPPORTED_ON_THIS_PLATFORM`
- `IOS_RUN_ALREADY_ACTIVE`
- `IOS_RUN_TIMEOUT`
- `IOS_BUILD_FAILED`
- `IOS_SIMULATOR_UNAVAILABLE`

Rules:

- codes are stable identifiers for tests and agents
- messages may be refined without changing the underlying semantic code
- `details` must stay structured and bounded

## Lifecycle and Concurrency Rules

### Named Locks

Use named locks for conflicting operations:

- `metro:<projectRoot>`
- `expo-mcp:<projectRoot>`
- `android-run:<projectRoot>`
- `ios-run:<projectRoot>`
- `mobile-mcp`

### Metro Rules

- `metro_start` is idempotent per project
- `metro_stop` is idempotent per project
- `metro_restart` is serialized per project
- `dev_server_attach` is serialized per project
- restarting Metro clears stale attach state for the same project
- PID presence alone does not count as health

### Child MCP Rules

- reuse healthy children rather than spawning duplicates
- clear cached child state after unexpected exit
- hidden child failures never crash the main MCP server
- attach and delegation only occur when preconditions are satisfied

### Android Rules

- only one active Android build per project
- duplicate `android_run` requests return structured typed errors
- timeout paths are explicit and test-covered

### Shutdown Rules

- on main server shutdown, tracked child processes are terminated cleanly
- forced termination is allowed after timeout and must update state correctly
- unexpected child exit must clear stale state promptly

## Command Resolution Strategy

### Expo CLI Resolution

`src/integrations/expo-cli.ts` should resolve execution in this order:

1. prefer local package executable resolution from the target project when feasible
2. otherwise use platform-safe `npx` or `npm exec`
3. normalize Windows executable naming such as `npx.cmd`
4. always return `{ command, args }`, never shell-joined commands

### Hidden MCP Resolution

- resolve `expo-mcp` and `mobile-mcp` from installed dependency metadata
- inspect installed `package.json` and its `bin` field
- support both string and object forms of `bin`
- resolve absolute executable paths before spawn
- return typed errors if the package exists but the executable cannot be resolved

### ADB Resolution

- prefer `adb` from PATH for v1
- return typed errors when `adb` is absent
- keep resolution logic isolated for later custom-path support

## Readiness and Parsing Contracts

### Metro Readiness

Treat startup as successful only after explicit readiness markers appear.

Valid primary markers:

- `Metro waiting on http://...`
- `Waiting on http://...` when clearly emitted by Expo or Metro startup output
- `› Metro waiting on ...`
- `Waiting on exp://...` may be supplemental but does not satisfy `expo-mcp` attach preconditions by itself

Invalid marker for this project:

- `Webpack waiting on ...`

Rules:

- prefer `http://127.0.0.1:<port>` or `http://localhost:<port>` for stored `devServerUrl`
- if the process starts but no HTTP readiness marker appears before timeout, return `METRO_START_TIMEOUT` or `METRO_URL_NOT_DETECTED`
- if the child exits before readiness, return `PROCESS_EXITED_EARLY` or `METRO_START_FAILED`

### Parser Policy

Parsers must transform raw output into stable, minimal, actionable objects.

Metro parser minimum classifications:

- module resolution errors
- TypeScript errors
- Babel parse errors
- asset resolution errors
- runtime redbox indicators

Gradle parser minimum classifications:

- dependency resolution failure
- SDK or NDK mismatch
- signing or config mismatch
- ADB install failure when visible in logs

Fix suggestion policy:

- rule-based and context-aware
- selected from known templates by parser classification
- concise and operational
- not speculative code rewrites

Every parser result should include:

- `type`
- `message`
- optional `summary`
- optional `file`
- optional `line`
- optional `column`
- `suggestedFixes`

### Session Summary Contract

`session_summary` should summarize one project session and include:

- project metadata
- Metro state
- hidden `expo-mcp` state
- hidden `mobile-mcp` state when relevant
- last Android-capable local run
- bounded recent Metro errors
- latest known device info
- macOS fields may remain absent or null during the Windows-first pass

## Delivery Plan

### Phase 0: Foundation

Objectives:

- scaffold package, build config, repo structure, and shared runtime primitives
- establish stores, response helpers, locks, and spawn abstraction
- define error codes and initial [README.md](../../README.md) stub early

Tests first:

- ring buffer tests
- process store tests
- log store tests
- session store tests
- spawn utility tests

Exit criteria:

- shared infrastructure is test-covered before tool implementation expands
- `bun run build` succeeds with foundational code in place

### Phase 1: Core MCP and Metro

Objectives:

- implement MCP bootstrap and tool registry
- implement `project_inspect`
- implement Expo CLI command resolution
- implement Metro lifecycle and bounded Metro logs

Tests first:

- `project-inspect.test.ts`
- Expo CLI command construction tests
- Metro readiness tests
- Metro lifecycle integration tests
- idempotent start and stop tests

Exit criteria:

- project inspection and Metro lifecycle work end-to-end with structured responses
- repeated calls behave correctly under idempotency and locking rules

### Phase 2: Metro Diagnostics

Objectives:

- implement fixture-driven Metro parsing
- implement `metro_errors_recent`
- deduplicate repeated equivalent errors

Tests first:

- Metro parser fixture tests
- recent-error integration tests
- deduplication tests

Exit criteria:

- recent Metro errors are surfaced as stable structured objects with suggestions

### Phase 3: Hidden `expo-mcp`

Objectives:

- resolve installed executable metadata correctly
- attach lazily only after Metro is healthy
- reuse healthy child state per project

Tests first:

- executable resolution tests
- attach success, failure, and missing-precondition tests
- child reuse and reconnect tests

Exit criteria:

- hidden attach behavior is resilient and fully test-covered
- child failure never terminates the main server

### Phase 4: Windows Development Workflows

Objectives:

- implement Gradle parser
- implement `android_run`
- implement `adb` fallback behavior for device operations
- keep the active implementation optimized for Windows development workflows

Tests first:

- Gradle parser tests
- Android run integration tests
- timeout and duplicate-run tests
- ADB fallback tests

Exit criteria:

- local run flows return phase-aware structured results
- device fallback behavior works without hidden MCPs when possible

### Phase 5: Hidden `mobile-mcp`

Objectives:

- resolve package executable metadata correctly
- implement lazy hidden child lifecycle
- implement screenshot and richer device behavior while preserving fallback paths

Tests first:

- executable resolution tests
- screenshot delegation tests
- child reuse and reconnect tests

Exit criteria:

- screenshot and richer device operations work through hidden MCP
- stale or failed child state does not poison later requests

### Phase 6: Summary, Docs, and Release Readiness

Objectives:

- implement `session_summary`
- finalize docs, notices, and release-facing artifacts
- keep macOS explicitly deferred

Tests first:

- session summary tests
- shutdown cleanup tests

Exit criteria:

- summary reflects orchestrator state accurately
- docs explain the single-server model, testing model, Windows-first scope, and current Linux status

## Test Inventory

Unit tests expected in active scope:

- `ring-buffer.test.ts`
- `process-store.test.ts`
- `log-store.test.ts`
- session-store tests
- `project-inspect.test.ts`
- Expo CLI command construction tests
- Metro readiness tests
- `metro-parser.test.ts`
- `gradle-parser.test.ts`
- hidden MCP executable resolution tests

Integration tests expected in active scope:

- `metro-start-stop.test.ts`
- `metro-log-capture.test.ts`
- `dev-server-attach.test.ts`
- `android-run-mock.test.ts`
- `device-screenshot-mock.test.ts`
- `session-summary.test.ts`

Lifecycle edge cases that must be covered in tests or explicitly deferred:

- repeated `metro_start`
- repeated `metro_stop`
- `metro_restart` with existing attach state
- hidden `expo-mcp` exit after successful attach
- attach requested before Metro URL exists
- duplicate `android_run` for the same project
- Android timeout path
- `adb` unavailable on PATH
- hidden `mobile-mcp` unavailable for screenshot request
- hidden `mobile-mcp` exit followed by reconnect
- main server shutdown while children are active

## Definition of Done

The project-init effort is complete only when:

- `bun run build` succeeds
- `bunx vitest run` passes on Windows
- `bunx vitest run --config vitest.windows.config.ts` passes on Windows
- `bunx vitest run --config vitest.live-windows.config.ts` passes on Windows
- only one public MCP server is exposed to the user
- Windows development flows are complete and test-covered
- Linux remains explicitly untested rather than implied
- macOS remains explicitly deferred rather than half-implemented
- lifecycle rules for reuse, cleanup, reconnect, and shutdown are covered by tests
- every completed behavior was implemented through the TDD loop rather than post-hoc testing
