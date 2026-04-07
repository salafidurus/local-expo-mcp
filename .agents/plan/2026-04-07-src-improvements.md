# src/ Code Improvements Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix real correctness bugs and eliminate structural duplication found across `src/`. No speculative refactors — every item here either fixes broken behaviour, removes copy-pasted code that will drift, or removes a hardcoded value that will cause a silent mismatch.

**Architecture:** No new files except one shared utility export. Changes are minimal and surgical.

**Tech Stack:** TypeScript, Node.js ≥20, Bun/Vitest

---

## Issues Found

### Bug 1 — `mobile-mcp-client.ts`: `ensureInitialized()` not called in 5 methods

`ensureInitialized()` sends the `mobile_init` tool call that the mobile-mcp server requires before any session commands. It is called in `screenshot`, `dumpUi`, `tap`, `swipe`, `typeText`, `keyPress` — but **not** in `listDevices`, `recentLogs`, `launchApp`, `terminateApp`, or `foregroundApp`.

Any of those five methods called first will reach a non-initialized server and get an error or silently wrong result.

**Location:** `src/integrations/mobile-mcp-client.ts:115-145`

**Fix:** Add `await ensureInitialized()` at the top of each of the five methods.

---

### Bug 2 — `metro-start.ts`: `context.clock()` called twice, timestamps can diverge

`src/tools/metro-start.ts:38` and `:52` both call `context.clock()` independently. In tests where `clock` is a counter, or under any load, these two timestamps will differ, leaving `ProcessStore` and `SessionStore` with different `startedAt` values for the same Metro start event.

**Fix:** Capture `const startedAt = context.clock()` once before the two store writes.

---

### Duplication 1 — `normalizeProjectRoot` copy-pasted into every tool file

Identical 1-line function repeated in at least:
- `src/tools/metro-start.ts:80`
- `src/tools/metro-stop.ts:50`
- `src/tools/metro-status.ts:23`
- `src/tools/metro-restart.ts` (expected)
- `src/tools/metro-logs-recent.ts` (expected)
- `src/tools/metro-errors-recent.ts` (expected)
- `src/tools/dev-server-attach.ts` (expected)
- `src/tools/android-run.ts` (expected)
- `src/tools/session-summary.ts` (expected)

**Fix:** Export `normalizeProjectRoot` from `src/utils/paths.ts` (it already exports path helpers). Delete all local copies and import the shared one.

---

### Duplication 2 — Session state types defined twice

`MetroSessionState`, `AttachedExpoMcpState`, `AndroidRunState`, and `ProjectSessionState` are defined identically in both:
- `src/app-context.ts:6-32`
- `src/state/session-store.ts:1-27`

`session-store.ts` does not import from `app-context.ts` so the types are truly duplicated. If one is changed the other silently diverges.

**Fix:** Delete the four type definitions from `session-store.ts` and import them from `app-context.ts`.

---

### Duplication 3 — Hardcoded `version: "0.1.0"` in three places

`src/server.ts:69`, `src/integrations/expo-mcp-client.ts:41`, and `src/integrations/mobile-mcp-client.ts:74` all hardcode `version: "0.1.0"` in the MCP `Client`/`McpServer` constructor. The package is already at `0.2.0` and will keep bumping. MCP clients use this for logging/debugging — having the wrong version is misleading.

**Fix:** Read the version at startup from `package.json` using `createRequire` (the same pattern already used in `src/utils/paths.ts:5`) and pass it through.

---

### Code quality — `parseUiNodes` uses untyped `any`

`src/integrations/mobile-mcp-client.ts:312` — the `walk(obj: any)` function bypasses TypeScript throughout `parseUiNodes`. A minimal local type would prevent accidental property access errors.

**Fix:** Replace `any` with a narrow local type:
```ts
type XmlNode = {
  node?: XmlNode | XmlNode[];
  text?: string;
  "content-desc"?: string;
  "resource-id"?: string;
  class?: string;
  bounds?: string;
  clickable?: string;
  enabled?: string;
  [key: string]: unknown;
};
```

---

### Code quality — `adb.ts` assigns the same timestamp to all log lines

`src/integrations/adb.ts:79` — all logcat lines in `recentLogs` receive `at: clock()`, which is one single timestamp captured at map-time. A burst of 1000 lines all end up with identical `at` values, making log ordering by time useless.

The logcat `-d` format includes a date/time prefix (`MM-DD HH:MM:SS.mmm`). Parsing it gives each line a real timestamp.

**Fix:** Add `parseAdbTimestamp(line)` that tries to extract the timestamp; fall back to `clock()` if parsing fails.

```ts
// Example logcat line: "04-07 14:23:01.123  1234  5678 I Tag: message"
function parseAdbTimestamp(line: string, year = new Date().getFullYear()): number | null {
  const match = /^(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/.exec(line);
  if (!match) return null;
  const parsed = Date.parse(`${year}-${match[1].replace(" ", "T")}`);
  return Number.isNaN(parsed) ? null : parsed;
}
```

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/utils/paths.ts` | **Modify** | Export `normalizeProjectRoot` |
| `src/tools/metro-start.ts` | **Modify** | Import shared `normalizeProjectRoot`; capture `startedAt` once |
| `src/tools/metro-stop.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/tools/metro-status.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/tools/metro-restart.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/tools/metro-logs-recent.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/tools/metro-errors-recent.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/tools/dev-server-attach.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/tools/android-run.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/tools/session-summary.ts` | **Modify** | Import shared `normalizeProjectRoot` |
| `src/state/session-store.ts` | **Modify** | Delete duplicated types; import from `app-context.ts` |
| `src/server.ts` | **Modify** | Read version from `package.json` |
| `src/integrations/expo-mcp-client.ts` | **Modify** | Read version from `package.json` |
| `src/integrations/mobile-mcp-client.ts` | **Modify** | `ensureInitialized` in 5 methods; `any` → typed; version from `package.json`; real timestamps in adb |
| `src/integrations/adb.ts` | **Modify** | Per-line timestamp parsing in `recentLogs` |

---

## Task 1 — Export `normalizeProjectRoot` from `src/utils/paths.ts`

**Files:**
- Modify: `src/utils/paths.ts`
- Modify: all tool files listed above

- [ ] **Step 1.1 — Verify tests pass before starting**

  ```bash
  bunx vitest run
  ```

- [ ] **Step 1.2 — Add `normalizeProjectRoot` to `src/utils/paths.ts`**

  Append to the end of the file:
  ```ts
  export function normalizeProjectRoot(projectRoot: string): string {
    return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  }
  ```

- [ ] **Step 1.3 — Remove local copies from each tool file**

  For each file that has a private `normalizeProjectRoot` function:
  1. Add `import { normalizeProjectRoot } from "../utils/paths.js";`
  2. Delete the local function definition

  Files to update: `metro-start.ts`, `metro-stop.ts`, `metro-status.ts`, `metro-restart.ts`, `metro-logs-recent.ts`, `metro-errors-recent.ts`, `dev-server-attach.ts`, `android-run.ts`, `session-summary.ts`

  Search to confirm no copies remain:
  ```bash
  grep -rn "function normalizeProjectRoot" src/
  ```
  Expected: zero results.

- [ ] **Step 1.4 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 1.5 — Commit**

  ```bash
  git add src/utils/paths.ts src/tools/
  git commit -m "refactor: centralize normalizeProjectRoot in utils/paths"
  ```

---

## Task 2 — Remove Duplicated Session State Types from `session-store.ts`

**Files:**
- Modify: `src/state/session-store.ts`

- [ ] **Step 2.1 — Delete the four duplicate type definitions from `session-store.ts`**

  Remove lines 1–27 (the four type blocks: `MetroSessionState`, `AttachedExpoMcpState`, `AndroidRunState`, `ProjectSessionState`).

  Add at the top of the file:
  ```ts
  import type {
    MetroSessionState,
    AttachedExpoMcpState,
    AndroidRunState,
    ProjectSessionState
  } from "../app-context.js";
  ```

- [ ] **Step 2.2 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 2.3 — Commit**

  ```bash
  git add src/state/session-store.ts
  git commit -m "refactor: import session state types from app-context instead of duplicating"
  ```

---

## Task 3 — Fix `metro-start.ts` Double Clock Call

**Files:**
- Modify: `src/tools/metro-start.ts`

- [ ] **Step 3.1 — Capture `startedAt` once**

  In `metro-start.ts`, before the two `context.processStore.upsert` and `context.sessionStore.merge` calls, add:
  ```ts
  const startedAt = context.clock();
  ```
  Replace both `context.clock()` calls inside those two blocks with `startedAt`.

- [ ] **Step 3.2 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 3.3 — Commit**

  ```bash
  git add src/tools/metro-start.ts
  git commit -m "fix: capture metro startedAt once so process and session records agree"
  ```

---

## Task 4 — Fix `mobile-mcp-client.ts`: Call `ensureInitialized()` in All Methods

**Files:**
- Modify: `src/integrations/mobile-mcp-client.ts`

- [ ] **Step 4.1 — Add `await ensureInitialized()` to the five missing methods**

  Add as the first line of each method body:
  - `listDevices` (line ~115)
  - `recentLogs` (line ~120)
  - `launchApp` (line ~126)
  - `terminateApp` (line ~132)
  - `foregroundApp` (line ~138)

  Example (before/after for `listDevices`):
  ```ts
  // Before
  async listDevices() {
    const result = await callTool("mobile_list_devices", {});

  // After
  async listDevices() {
    await ensureInitialized();
    const result = await callTool("mobile_list_devices", {});
  ```

- [ ] **Step 4.2 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 4.3 — Commit**

  ```bash
  git add src/integrations/mobile-mcp-client.ts
  git commit -m "fix: call ensureInitialized in all mobile-mcp methods, not just gesture methods"
  ```

---

## Task 5 — Fix Hardcoded Version in MCP Constructors

**Files:**
- Modify: `src/server.ts`
- Modify: `src/integrations/expo-mcp-client.ts`
- Modify: `src/integrations/mobile-mcp-client.ts`

- [ ] **Step 5.1 — Add a shared version reader to `src/utils/paths.ts`**

  ```ts
  import { readFileSync } from "node:fs";

  export function readPackageVersion(): string {
    try {
      const pkg = JSON.parse(
        readFileSync(new URL("../../package.json", import.meta.url), "utf8")
      ) as { version: string };
      return pkg.version;
    } catch {
      return "0.0.0";
    }
  }
  ```

- [ ] **Step 5.2 — Use `readPackageVersion()` in `src/server.ts`**

  ```ts
  import { readPackageVersion } from "./utils/paths.js";
  // ...
  const mcpServer = new McpServer({
    name: "local-expo-mcp",
    version: readPackageVersion()
  });
  ```

- [ ] **Step 5.3 — Use `readPackageVersion()` in `expo-mcp-client.ts` and `mobile-mcp-client.ts`**

  Replace the hardcoded `version: "0.1.0"` in the `new Client(...)` calls in both files.

- [ ] **Step 5.4 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 5.5 — Commit**

  ```bash
  git add src/utils/paths.ts src/server.ts src/integrations/expo-mcp-client.ts src/integrations/mobile-mcp-client.ts
  git commit -m "fix: read MCP server/client version from package.json instead of hardcoding"
  ```

---

## Task 6 — Fix `parseUiNodes` Untyped `any`

**Files:**
- Modify: `src/integrations/mobile-mcp-client.ts`

- [ ] **Step 6.1 — Replace `any` with a local type**

  Add above `parseUiNodes`:
  ```ts
  type XmlNode = {
    node?: XmlNode | XmlNode[];
    text?: string;
    "content-desc"?: string;
    "resource-id"?: string;
    class?: string;
    bounds?: string;
    clickable?: string;
    enabled?: string;
    [key: string]: unknown;
  };
  ```

  Change `function walk(obj: any)` → `function walk(obj: unknown)`.

  Inside `walk`, replace the `obj` usages with a narrowed check:
  ```ts
  function walk(obj: unknown): void {
    if (!obj || typeof obj !== "object") return;
    const typed = obj as XmlNode;
    // use typed.node, typed.text, etc.
    for (const key of Object.keys(typed)) {
      if (key !== "node") walk(typed[key]);
    }
  }
  ```

- [ ] **Step 6.2 — Build to verify no TypeScript errors**

  ```bash
  bun run build
  ```
  Expected: clean build.

- [ ] **Step 6.3 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 6.4 — Commit**

  ```bash
  git add src/integrations/mobile-mcp-client.ts
  git commit -m "fix: replace any with typed XmlNode in parseUiNodes"
  ```

---

## Task 7 — Fix `adb.ts` Single-Timestamp Log Entries

**Files:**
- Modify: `src/integrations/adb.ts`

- [ ] **Step 7.1 — Add `parseAdbTimestamp` helper**

  Add to `src/integrations/adb.ts`:
  ```ts
  function parseAdbTimestamp(line: string): number | null {
    // Logcat format: "MM-DD HH:MM:SS.mmm  pid  tid  level  tag: message"
    const match = /^(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/.exec(line);
    if (!match) return null;
    const year = new Date().getFullYear();
    const parsed = Date.parse(`${year}-${match[1].replace(" ", "T")}`);
    return Number.isNaN(parsed) ? null : parsed;
  }
  ```

- [ ] **Step 7.2 — Use per-line timestamp in `recentLogs`**

  Change the `map` in `recentLogs` from:
  ```ts
  .map((line) => ({
    level: classifyAdbLogLevel(line),
    text: line,
    at: clock()
  } satisfies MetroLogEntry));
  ```
  To:
  ```ts
  .map((line) => ({
    level: classifyAdbLogLevel(line),
    text: line,
    at: parseAdbTimestamp(line) ?? clock()
  } satisfies MetroLogEntry));
  ```

- [ ] **Step 7.3 — Run tests**

  ```bash
  bunx vitest run
  ```
  Expected: all pass.

- [ ] **Step 7.4 — Commit**

  ```bash
  git add src/integrations/adb.ts
  git commit -m "fix: parse per-line timestamps from adb logcat output"
  ```

---

## Task 8 — Final Build Verification

- [ ] **Step 8.1 — Full build + all tests**

  ```bash
  bun run build && bunx vitest run
  ```
  Expected: clean build, all tests green.
