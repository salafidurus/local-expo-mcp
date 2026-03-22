# Testing And Validation

## TDD Is Mandatory

Use this loop for behavior-bearing work:
1. write or update a focused test
2. run it and confirm the expected failure
3. implement the smallest fix
4. rerun the focused test
5. rerun the broader affected suite
6. only then treat the task as done

## Validation Baseline

For Windows-scope changes, the expected validation target is:

```bash
bunx vitest run
bunx vitest run --config vitest.windows.config.ts
bunx vitest run --config vitest.live-windows.config.ts
bun run build
```

## Live Testing

Windows live testing is required for accepted Windows-scope work.

Important live assets:
- `test/live-projects/expo-smoke-app`
- `test/live-projects/expo-broken-module-app`

## Test Layout

- `test/unit/`: cross-platform non-live logic tests
- `test/integration/`: cross-platform orchestration tests with fakes
- `test/windows/`: Windows-specific non-live tests
- `test/live/`: cross-platform live tests
- `test/live-windows/`: Windows-only live tests

## When To Add Tests

Add or extend tests for:
- schema changes
- new public tools
- lifecycle changes
- child-process failure handling
- hidden MCP reconnect behavior
- release automation and package metadata changes
