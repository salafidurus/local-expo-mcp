# `local-expo-mcp` Windows Implementation Plan

## Status

This is the active implementation plan for the current environment.

Active environment assumptions:

- development happens on Windows
- no macOS runtime or simulator access is available
- Metro and local Expo development workflows are the delivery target for this pass
- Android-capable local flows remain in scope where they are part of Windows development
- Linux has not been tested yet and should be treated as unvalidated
- macOS implementation and macOS-specific tests are deferred into [1-project-init-implementation-mac.md](1-project-init-implementation-mac.md)

## Delivery Method

Use strict TDD for every behavior-bearing task.

Required loop:

1. write or extend a focused test
2. run it and confirm it fails for the expected reason
3. implement the smallest code change needed to pass it
4. rerun the focused test
5. rerun the broader relevant suite
6. only then mark the task done

Completion rule:

- a task is not complete if the intended new test was never observed failing first
- if behavior is hard to test, first create the seam or interface needed to test it
- prefer unit tests for pure logic and integration tests with fakes for orchestration and process behavior

## Active Scope

Included:

- package scaffold and build system
- MCP server bootstrap over STDIO with shutdown cleanup
- `project_inspect`
- Metro lifecycle tools
- Metro log capture and Metro error parsing
- hidden `expo-mcp` attach and detach lifecycle
- local Expo run orchestration relevant to Windows development
- `adb` fallback device operations
- hidden `mobile-mcp` integration for screenshots and richer device operations when available
- `session_summary`
- repo-owned live Metro and Android test assets
- [README.md](../../README.md), `LICENSE`, [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md), and `.gitignore`

Excluded for this pass:

- `ios_run`
- `xcode-parser`
- `ios-sim` integration
- macOS integration tests
- macOS-only live tests
- any implied Linux support claim

## Runtime Architecture

### App Context

Implement one explicit runtime container for the whole server.

Current shape:

```ts
type AppContext = {
  clock: () => number;
  processStore: ProcessStore;
  sessionStore: SessionStore;
  logStore: LogStore;
  locks: LockManager;
  integrations: {
    expoCli: ExpoCliIntegration;
    expoMcp?: ExpoMcpIntegration;
    androidExpoCli?: AndroidExpoCliIntegration;
    adb?: AdbIntegration;
    mobileMcp?: MobileMcpIntegration;
  };
  runtime: {
    metroControllers: Map<string, MetroController>;
    expoMcpAttachments: Map<string, ExpoMcpAttachment>;
    activeAndroidRuns: Set<string>;
    latestDeviceInfo: DeviceInfo[];
  };
};
```

### Wiring Rules

- `src/server.ts` creates one `AppContext`
- `src/mcp/tool-registry.ts` registers tool handlers by injecting `AppContext`
- tools export handler factories such as `createProjectInspectHandler(context)`
- no tool should import mutable singleton state directly
- all integrations and stores must be replaceable in tests
- `startServer` must register shutdown hooks and call `disposeAppContext`

### Session Model

Use project-scoped sessions keyed by normalized `projectRoot`.

Rules:

- one server may hold multiple project sessions in memory
- each project may have at most one active Metro process
- each project may have at most one active `expo-mcp` attachment
- each project may have at most one active local Android run
- `mobile-mcp` is currently treated as a reusable shared integration with cached connection state

## Response Contract

### Success Envelope

All successful tools return:

```json
{ "ok": true, "...": "tool-specific fields" }
```

### Failure Envelope

All failed tools return:

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

### Error Code Baseline

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

Hidden MCP:

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

Rules:

- error codes are stable identifiers for agents and tests
- `message` may be refined, but `code` should not drift casually
- `details` must stay structured and bounded

## Lifecycle Rules

### Lock Keys

Use named locks for conflicting operations:

- `metro:<projectRoot>`
- `expo-mcp:<projectRoot>`
- `android-run:<projectRoot>`
- `mobile-mcp`

### Metro Rules

- `metro_start` is idempotent per project
- `metro_stop` is idempotent per project
- `metro_restart` is serialized per project
- `dev_server_attach` is serialized per project
- stopping or restarting Metro clears stale `expo-mcp` attach state for that project
- PID presence alone does not count as health
- if Metro already exists for a project, reuse it instead of silently shifting to a new port
- if no active Metro exists and the requested port is unavailable, choose a free port

### Child MCP Rules

- reuse a healthy child rather than spawning duplicates
- explicit close and detach must clear cached child state
- child failures never crash the main MCP server
- attach never occurs until preconditions are satisfied

### Local Run Rules

- only one active `android_run` per project
- duplicate run attempts return typed structured failure
- timeout is explicit and test-covered

## Tool Contracts

### `project_inspect`

Purpose:

- verify project root
- detect Expo project
- detect package manager
- detect Android and iOS directories
- detect Expo config file
- recommend the next workflow step

### `metro_start`

Purpose:

- start Metro via Expo CLI
- capture stdout and stderr
- detect readiness and dev-server URL
- persist PID and project session state

### `metro_stop`

Purpose:

- stop Metro cleanly
- clear hidden `expo-mcp` attachment state for the same project
- update state consistently
- remain idempotent when Metro is not running

### `metro_restart`

Purpose:

- stop existing Metro
- clear stale attach state
- start Metro again and return new runtime state

### `metro_status`

Purpose:

- return running state, pid, port, dev-server URL, and uptime

### `metro_logs_recent`

Purpose:

- return bounded recent Metro lines from the ring buffer
- classify each line minimally as info, warn, or error

### `metro_errors_recent`

Purpose:

- parse recent Metro logs into structured error objects
- deduplicate repeated equivalent issues
- attach rule-based fix suggestions

### `dev_server_attach`

Purpose:

- lazily start hidden `expo-mcp` only after Metro is healthy
- connect internally over STDIO
- reuse healthy attachments
- expose attach state without surfacing the hidden server directly to the user

### `android_run`

Purpose:

- run local Android build with Expo CLI when relevant to Windows development
- capture output and classify build phases
- summarize common failure types

### `device_list`

Purpose:

- list available devices
- prefer hidden `mobile-mcp` when it supports device listing
- fall back to `adb devices`

### `device_logs_recent`

Purpose:

- return recent Android logs
- prefer hidden `mobile-mcp` when it supports log access
- otherwise use `adb logcat`

### `device_screenshot`

Purpose:

- capture screenshot through hidden `mobile-mcp`
- return saved path
- return typed unsupported result if no reliable screenshot path exists

### `session_summary`

Purpose:

- summarize current orchestrator state for one project session
- include project metadata, Metro state, attach state, last Android run, bounded recent Metro errors, and latest device info

## Metro Readiness Contract

Treat startup as successful only after explicit readiness markers are observed or the selected TCP port becomes reachable within the timeout window.

Primary readiness markers:

- `Metro waiting on http://...`
- `Waiting on http://...` when clearly from Expo or Metro startup output
- `› Metro waiting on ...`
- `Waiting on exp://...` may be supplemental but is not enough by itself for `expo-mcp` attach

Rules:

- prefer `http://127.0.0.1:<port>` or `http://localhost:<port>` as stored `devServerUrl`
- `Webpack waiting on` is not a valid Metro marker for this project
- if no HTTP readiness marker appears before timeout, use the selected port reachability fallback
- if the child exits before readiness, return `PROCESS_EXITED_EARLY` or `METRO_START_FAILED`

## Parser Policy

### Metro Parser

Must classify at minimum:

- module resolution errors
- TypeScript errors
- Babel parse errors
- asset resolution errors when visible
- runtime redbox indicators

### Gradle Parser

Must classify at minimum:

- dependency resolution failures
- SDK or NDK mismatch
- signing or config mismatch
- ADB install failure when visible

### Fix Suggestions

For v1, fix suggestions are rule-based and context-aware, not speculative rewrites.

Rules:

- choose suggestions from known templates based on parser classification
- interpolate extracted context where useful
- keep suggestions concise and operational
- do not emit speculative patches or broad essays in parser output

## Detailed Test Inventory

### Unit Tests

Implemented or required:

- `test/unit/ring-buffer.test.ts`
- `test/unit/process-store.test.ts`
- `test/unit/log-store.test.ts`
- `test/unit/session-store.test.ts`
- `test/unit/project-inspect.test.ts`
- `test/unit/expo-cli.test.ts`
- `test/unit/expo-cli-integration.test.ts`
- `test/unit/metro-readiness.test.ts`
- `test/unit/metro-parser.test.ts`
- `test/unit/gradle-parser.test.ts`
- `test/unit/expo-mcp-client.test.ts`
- `test/unit/mobile-mcp-client.test.ts`
- `test/unit/server.test.ts`
- `test/unit/app-context.test.ts`

### Integration Tests

Implemented or required:

- `test/integration/metro-start-stop.test.ts`
- `test/integration/metro-restart.test.ts`
- `test/integration/dev-server-attach.test.ts`
- `test/integration/android-run-mock.test.ts`
- `test/integration/device-fallbacks.test.ts`
- `test/integration/device-screenshot-mock.test.ts`
- `test/integration/session-summary.test.ts`

### Live Tests

Implemented for this Windows-first scope:

- `test/live/adb-live.test.ts`
- `test/live-windows/metro-live-windows.test.ts`

### Fixtures

Implemented or required:

- `test/fixtures/logs/metro-module-resolution.txt`
- `test/fixtures/logs/metro-typescript.txt`
- `test/fixtures/logs/metro-babel.txt`
- `test/fixtures/logs/gradle-failure.txt`
- `test/fixtures/expo-project-basic/`
- `test/fixtures/expo-project-failing-module/`
- `test/live-projects/expo-smoke-app/`
- `test/live-projects/expo-broken-module-app/`

## Phase Plan

### Phase 0: Foundation

Acceptance status:

- complete for current Windows scope

### Phase 1: Core MCP and Metro

Acceptance status:

- complete for current Windows scope

### Phase 2: Metro Diagnostics

Acceptance status:

- core classification complete
- additional Metro failure families can be expanded later without changing the architecture

### Phase 3: Hidden `expo-mcp`

Acceptance status:

- attach, reuse, detach, and Metro-coupled cleanup complete
- unexpected child-exit simulation can still be expanded if a concrete regression appears

### Phase 4: Windows Development Workflows

Acceptance status:

- complete for current Windows scope

### Phase 5: Hidden `mobile-mcp`

Acceptance status:

- screenshot, close, reuse, and preferred device and log usage when supported are complete
- richer hidden `mobile-mcp` capabilities can be added later without changing public tool shape

### Phase 6: Summary and Release Readiness

Acceptance status:

- summary, docs, notices, CI, release workflow, Dependabot, and changelog are complete
- deferred hardening remains for the automation-owned `release/next` branch rule

## Lifecycle Edge-Case Matrix

Covered in tests:

- repeated `metro_start` on a healthy project
- repeated `metro_stop` on an inactive project
- `metro_restart` while attach state exists
- attach requested before Metro URL exists
- Android run requested while another Android run is active for the same project
- hidden `mobile-mcp` unavailable while screenshot is requested
- hidden `mobile-mcp` close and reconnect behavior
- main server shutdown with active child processes
- Windows Metro shutdown and live Metro restartability

Still expandable if needed:

- simulated unexpected hidden child exit without explicit close
- richer `mobile-mcp` tool forwarding beyond current screenshot and optional preference paths
- future Linux validation once a Linux environment is available
- light `release/next` branch protection that blocks accidental deletion or manual reuse of the branch name without blocking workflow force-push updates

## Validation Gates

Before closing this plan’s scope:

- `bun run build` succeeds
- `bunx vitest run` passes on Windows
- `bunx vitest run --config vitest.windows.config.ts` passes on Windows
- `bunx vitest run --config vitest.live-windows.config.ts` passes on Windows
- Windows development flows are implemented and test-covered
- Linux is documented as untested
- user-facing documentation shows only one public MCP server
