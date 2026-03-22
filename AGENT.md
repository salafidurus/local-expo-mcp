# AGENT Guide

This file is for coding agents and contributors working inside this repository.

## Priority

When repo guidance conflicts with the public [README.md](README.md), follow this file for implementation work and keep the README user-facing.

## Scope

Active scope is Windows-first local development.

Current status:
- Windows is implemented and validated
- macOS is deferred into [.agents/plan/1-project-init-implementation-mac.md](.agents/plan/1-project-init-implementation-mac.md)
- Linux is explicitly untested and not yet planned
- EAS is out of scope

## Mandatory Workflow

Use TDD for behavior-bearing work.

Required loop:
1. add or update a focused test first
2. run it and confirm it fails for the expected reason
3. implement the smallest change needed
4. rerun the focused test
5. rerun the broader relevant suite
6. only then mark the work done

Do not treat a task as complete just because the code compiles.

## Validation Commands

Core commands:

```bash
bun install
bun run build
bun run commitlint
bunx vitest run
bun run test:windows
bun run test:live:windows
bun run test:acceptance
```

Expected Windows acceptance baseline:
- `bunx vitest run`
- `bunx vitest run --config vitest.windows.config.ts`
- `bunx vitest run --config vitest.live-windows.config.ts`
- `bun run build`

## Repo Map

Important files:
- `src/server.ts`: MCP bootstrap and shutdown path
- `src/app-context.ts`: runtime context and integration contracts
- `src/mcp/schemas.ts`: public input contracts
- `src/mcp/tool-registry.ts`: public tool surface
- `src/integrations/`: local process and hidden MCP integrations
- `src/tools/`: public tool handlers
- `test/live-projects/`: repo-owned live repro Expo apps
- `.agents/plan/`: project plans
- `.agents/skills/`: repo-specific agent guidance

## Public Contract Rules

Keep these stable unless there is a deliberate contract change:
- public tool names
- schema shapes
- success and failure envelopes
- error codes

Do not add raw passthrough tools for hidden MCPs without a deliberate public contract decision.

## Release Rules

Current publishing model:
- CI runs install, commitlint, tests, and build
- semantic-release manages versioning and changelog
- merged PRs labeled `publish` can trigger publishing
- stale publish automation can publish when there has been no publish for 7 days and a release is pending

## Docs Split

Use the docs this way:
- [README.md](README.md): user-facing package docs and client setup
- [AGENT.md](AGENT.md): repo workflow and implementation constraints
- [.agents/skills/](.agents/skills): specialized repo guidance for agents
- [.agents/plan/](.agents/plan): planning documents

## Before Large Changes

Read these first when relevant:
- [.agents/skills/repo-conventions.md](.agents/skills/repo-conventions.md)
- [.agents/skills/folder-structure.md](.agents/skills/folder-structure.md)
- [.agents/skills/public-contracts.md](.agents/skills/public-contracts.md)
- [.agents/skills/testing-and-validation.md](.agents/skills/testing-and-validation.md)
- [.agents/skills/release-and-publishing.md](.agents/skills/release-and-publishing.md)
- [.agents/skills/docs-and-guidance.md](.agents/skills/docs-and-guidance.md)
