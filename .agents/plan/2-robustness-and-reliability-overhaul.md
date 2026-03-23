---
title: Robustness and Reliability Overhaul
status: completed
created: 2026-03-23
updated: 2026-03-23
---

# Plan: Robustness and Reliability Overhaul (TDD)

This plan addresses critical implementation bugs, performance bottlenecks, and reliability gaps identified in the `local-expo-mcp` codebase. We will use a strict **Test-Driven Development (TDD)** approach for each phase.

## TDD Workflow for Each Task
1.  **Red (Write Test):** Create a reproduction test case that fails due to the bug or missing feature.
2.  **Verify Failure:** Run the test to confirm it fails as expected.
3.  **Green (Implement):** Apply the minimal code change to satisfy the test.
4.  **Refactor:** Clean up the implementation while ensuring the test remains green.
5.  **Verify Success:** Run the full test suite to ensure no regressions.
6.  **Commit:** Commit the changes (fix + tests) with a descriptive message.

---

## Phase 1: Critical Concurrency & Process Lifecycle

### 1.1 Fix `LockManager` Memory Leak (Atomic Cleanup)
- **Problem:** `#queues` entries are never deleted.
- **TDD:** Add a unit test in `test/unit/locks.test.ts` that uses a `protected` inspector to verify the map size is 0 after all locks are released.
- **Fix:** Update `src/locks.ts` cleanup logic: 
  - Compare the `latest` promise reference with the current queue's state *within* the final `.finally()` block.
  - Delete the key from the map ONLY if no new requests were queued during the cleanup tick.
- **Commit:** `fix: atomic LockManager cleanup and map entry deletion`

### 1.2 Prevent Indefinite Termination Hangs (Standard Timeout)
- **Problem:** `stopChildProcess` and `runCommand` hang if `SIGTERM` is ignored.
- **TDD:** Add integration test in `test/unit/expo-cli.test.ts` mocking a process that ignores `SIGTERM`. Verify it is killed within 5s.
- **Fix:** 
  - Define `PROCESS_TERMINATION_GRACE_PERIOD = 5000`.
  - Use `Promise.race` between the process `close` event and a `setTimeout`.
  - Trigger `SIGKILL` (Unix) or `taskkill /F` (Windows) if the timeout wins.
- **Commit:** `fix: implement fallback SIGKILL/taskkill for hanging processes`

### 1.3 Robust Windows Spawning (No `shell: true`)
- **Problem:** Fragile `cmd /c` wrapping for `.cmd` files leads to quoting bugs.
- **TDD:** Add a unit test in `test/windows/spawn-windows.test.ts` attempting to run a command with spaces in both the binary path and arguments.
- **Fix:** Update `prepareSpawnCommand` in `src/utils/spawn.ts`:
  - Detect `.cmd`/`.bat` files via `path.extname`.
  - Use an array-based `spawn` call that explicitly wraps the command in `cmd.exe`, `/c`, and the target command with proper double-quoting.
- **Commit:** `fix: robust Windows command spawning with proper quoting`

---

## Phase 2: Robust Data Parsing & Memory Safety

### 2.1 Streaming ADB Logs (Performance & Memory)
- **Problem:** `exec` buffers the entire logcat, risking memory overflow and performance degradation.
- **TDD:** Mock a massive (10MB+) logcat stream and verify the MCP server remains responsive and memory stable.
- **Fix:** Update `src/integrations/adb.ts`:
  - Replace `exec` with `spawn` for `adb logcat`.
  - Use a `readline` interface to stream `stdout` line-by-line into the project's `RingBuffer`.
- **Commit:** `fix: stream adb logcat to prevent memory pressure`

### 2.2 Hierarchical UI Parsing (Dependency: `fast-xml-parser`)
- **Problem:** Regex parsing flattens tree and fails on complex attributes.
- **TDD:** Add tests in `test/unit/mobile-mcp-client.test.ts` with deeply nested nodes and attributes containing special characters (`>`, `"`, `'`).
- **Fix:** 
  - `bun add fast-xml-parser`.
  - Replace regex logic in `src/integrations/mobile-mcp-client.ts` with a robust tree-building parser.
- **Commit:** `feat: use fast-xml-parser for robust mobile UI hierarchy reconstruction`

---

## Phase 3: Missing Integration & Edge Cases

### 3.1 Metro Port Conflict Detection
- **TDD:** Mock a non-Metro HTTP server on port 8081 and verify `metro_start` returns `PortOccupiedByAnotherProcess`.
- **Fix:** Update `src/parsers/metro-readiness.ts`:
  - Fetch `http://localhost:8081/status`.
  - If 200 and body contains `packager-status:running`, it's Metro.
  - If 200 but body is different, or it returns another code, it's a conflict.
- **Commit:** `fix: distinguish between Metro ready and port occupancy conflicts`

### 3.2 Robust ADB Device States
- **TDD:** Mock `adb devices` output with `unauthorized`, `offline`, and `recovery`.
- **Fix:** Update `src/integrations/adb.ts` parser to capture these states and provide clear tool responses (e.g., "Device unauthorized, please accept the prompt on screen").
- **Commit:** `feat: improve adb device state detection and error messaging`

---

## Verification Requirements
- **Cross-Platform:** Must pass `bun run test` (Unix) and `bun run test:windows` (Windows).
- **CI Parity:** Ensure all new tests pass in the GitHub Actions environment.
