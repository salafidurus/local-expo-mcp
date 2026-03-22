# Live Projects

This folder contains repo-owned Expo projects for real Metro and Android smoke testing.

## Purpose

These projects exist so live verification does not depend on an external application path and so contributors can reproduce MCP failures inside a shared, versioned workspace.

## Current Projects

- `expo-smoke-app`
  - intended to be the passing baseline for live Metro startup and simple Android smoke validation
- `expo-broken-module-app`
  - intentionally imports a missing module so contributors can reproduce Metro module-resolution failures against a real Expo app shape

## Usage

To run the live Metro smoke test against the passing app:

```powershell
$env:LIVE_EXPO_PROJECT_ROOT = "C:\dev\local-expo-mcp\test\live-projects\expo-smoke-app"
bun run test:live
```

To manually exercise the broken app:

```powershell
cd test\live-projects\expo-broken-module-app
bun install
npx expo start
```

## Notes

- These are real app roots, not parser fixtures.
- Each live project should stay small and single-purpose.
- If a new MCP failure mode needs reproduction, add another focused app instead of overloading one existing app.
- Dependencies for these projects are not installed automatically by the repo root.
- For now, contributors are expected to install dependencies inside the specific live project they want to run.
