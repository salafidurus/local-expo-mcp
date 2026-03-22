# Repo Conventions

This file defines the default implementation conventions for `local-expo-mcp`.

Use it together with:
- [AGENT.md](../../AGENT.md) for workflow and validation requirements
- [testing-and-validation.md](testing-and-validation.md) for TDD and test execution
- [release-and-publishing.md](release-and-publishing.md) for release automation
- [folder-structure.md](folder-structure.md) for placement rules
- [public-contracts.md](public-contracts.md) for MCP contract rules
- [docs-and-guidance.md](docs-and-guidance.md) for README vs agent-doc ownership

## Platform And Scope

This repo is Windows-first today.

Rules:
- Windows behavior is active scope
- macOS work is deferred
- Linux is unvalidated and must not be implied as supported
- EAS is out of scope
- do not present Android-capable flows as meaning Linux or macOS support exists

## Core Architecture

The server exposes one public MCP surface only.

Internal layers:
- direct Expo CLI process control
- `adb` fallback behavior
- hidden `expo-mcp`
- hidden `mobile-mcp`
- in-memory orchestration state

The intended architecture is:
- `src/server.ts` owns bootstrap and shutdown
- `src/app-context.ts` owns shared runtime contracts and integration types
- `src/mcp/` owns MCP registration, schemas, and response helpers
- `src/tools/` owns public tool handlers only
- `src/integrations/` owns boundary code that talks to processes, CLIs, or hidden MCPs
- `src/parsers/` owns raw-output classification logic
- `src/state/` owns in-memory stores
- `src/utils/` owns small reusable helpers, not generic abstraction dumping grounds

## Design Principles

Prefer these defaults:
- one public tool per intentional workflow capability
- curated public tools over raw passthroughs
- typed envelopes over raw terminal output
- small files close to the runtime boundary they belong to
- extraction only when duplication or complexity justifies it

Avoid these defaults:
- placeholder abstractions added only because a plan once listed them
- catch-all `types.ts` files when a runtime-local type home is clearer
- generic wrappers around everything
- exposing hidden child MCPs directly to the user

## Source Of Truth Rules

Use these as the contract sources of truth:
- public tool names: `src/mcp/tool-registry.ts`
- public input schemas: `src/mcp/schemas.ts`
- shared runtime contracts: `src/app-context.ts`
- error codes and error normalization: `src/utils/errors.ts`
- response envelope helpers: `src/mcp/responses.ts`

If behavior changes but these files are not updated, the change is probably incomplete.

## Hidden MCP Policy

Hidden MCP integrations are implementation details.

Rules:
- do not expose raw passthrough tools by default
- map hidden MCP behavior into curated public tools
- prefer graceful degradation when hidden MCPs are absent or stale
- child failures must not crash the main MCP server
- if a hidden client goes stale, clear cached state and allow reconnect on the next request

## Process And State Rules

Important runtime expectations:
- Metro is project-scoped and should be reused when healthy
- hidden `expo-mcp` attach is project-scoped
- Android run is serialized per project
- stale child state should be cleared, not reused blindly
- runtime stores are in-memory only for v1

When changing lifecycle behavior, update tests for:
- reuse
- shutdown
- reconnect-after-failure
- fallback behavior

## Public Surface Rules

Protect these carefully:
- tool names
- tool schemas
- error codes
- result envelopes
- behavior that README examples depend on

Any public-surface change should be:
- deliberate
- documented
- schema-covered
- test-covered

## Testing Expectations

Do not add behavior without deciding where it belongs in the test matrix.

Use this split:
- `test/unit/`: pure logic and narrow contracts
- `test/integration/`: orchestration with fakes
- `test/windows/`: Windows-only non-live behavior
- `test/live/`: cross-platform live tests
- `test/live-windows/`: Windows-only live tests

If a change affects process spawning, Metro lifecycle, hidden MCP lifecycle, or fallback behavior, integration coverage is usually required.

## Live Project Hygiene

`test/live-projects/` exists for real repro apps, but it can become noisy.

Rules:
- keep live apps intentionally small
- do not recursively inspect `node_modules/` unless absolutely necessary
- do not treat generated logs or `.expo/` artifacts as source-of-truth docs
- prefer fixture apps for deterministic parsing tests
- prefer live projects for actual runtime reproduction only

## Documentation Ownership

Keep docs split cleanly:
- [README.md](../../README.md): user-facing package docs and client setup
- [AGENT.md](../../AGENT.md): repo workflow and implementation expectations
- [.agents/skills/](../skills): specialized repo guidance for agents
- [.agents/plan/](../plan): planning and delivery docs

Do not move agent-only instructions back into the public README.

## When To Extract A New Skill Doc

Split guidance into a separate skill doc when it is:
- detailed enough to distract from the parent document
- stable enough to be reused across many tasks
- focused on one area such as folder placement, contracts, docs ownership, or release behavior

That is preferred over turning `repo-conventions.md` into a long catch-all file.
