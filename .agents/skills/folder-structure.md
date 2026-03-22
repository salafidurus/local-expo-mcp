# Folder Structure

Use this file when deciding where new code, tests, fixtures, or docs belong.

## Source Layout

Top-level source ownership:
- `src/server.ts`: MCP bootstrap and shutdown wiring
- `src/app-context.ts`: shared runtime contracts and integration interfaces
- `src/locks.ts`: concurrency primitives
- `src/mcp/`: MCP registration, schemas, and response helpers
- `src/state/`: in-memory stores
- `src/tools/`: public tool handlers only
- `src/integrations/`: external system boundaries
- `src/parsers/`: raw output parsing and classification
- `src/utils/`: narrow reusable helpers

## Where New Code Goes

Put code in `src/tools/` when:
- it defines one public MCP tool
- it composes stores, parsers, and integrations into a user-facing workflow

Put code in `src/integrations/` when:
- it talks to Expo CLI, `adb`, filesystem-resolved executables, or hidden MCP clients
- it owns process spawning or external protocol details

Put code in `src/parsers/` when:
- it converts raw CLI or log output into structured classification
- it should be testable without real process execution

Put code in `src/state/` when:
- it owns in-memory state containers or state mutation helpers

Put code in `src/utils/` when:
- it is small, reusable, and not better owned by a boundary-specific module

## Where New Code Should Not Go

Avoid:
- catch-all `helpers.ts` growth
- generic `types.ts` dumping grounds
- putting public business logic into `server.ts`
- putting parsing logic into tool handlers
- putting boundary process logic into tests just because a test needs a fake

## Test Layout

- `test/unit/`: pure logic, schemas, metadata, parser rules, store behavior
- `test/integration/`: tool orchestration with fakes or mocks
- `test/windows/`: Windows-specific non-live behavior
- `test/live/`: cross-platform live tests
- `test/live-windows/`: Windows-only live tests

## Fixtures And Live Projects

- `test/fixtures/`: deterministic small fixtures
- `test/live-projects/`: real runnable repro apps

Use fixtures when you need deterministic parser or inspection behavior.
Use live projects when you need actual Expo runtime validation.

## Docs Layout

- [README.md](../../README.md): end-user package docs
- [AGENT.md](../../AGENT.md): repo workflow and contributor guidance
- [.agents/skills/](../skills): specialized repo guidance
- [.agents/plan/](../plan): project plans

## Naming Conventions

Prefer descriptive file names that match the capability:
- tool: `device-app-launch.ts`
- parser: `metro-parser.ts`
- integration: `mobile-mcp-client.ts`
- test: `device-mobile-forwarding.test.ts`

Keep names aligned across source and tests when practical.
