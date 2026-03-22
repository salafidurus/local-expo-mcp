# Public Contracts

Use this file before changing the public MCP surface.

## Stable Contract Areas

Treat these as public contracts:
- tool names
- input schemas
- success envelopes
- error envelopes
- stable error codes
- user-facing behavior documented in [README.md](../../README.md)

## Current Source Of Truth

- tool registry: `src/mcp/tool-registry.ts`
- schemas: `src/mcp/schemas.ts`
- responses: `src/mcp/responses.ts`
- errors: `src/utils/errors.ts`
- bootstrap error normalization: `src/server.ts`

## Public Tool Rule

A new public tool should exist only when it represents an intentional user-facing capability.

Do not add tools that are just:
- hidden MCP passthroughs
- temporary debugging hooks
- raw wrappers around one internal command with no stable contract

## Schema Rule

If a tool takes input, add or update its schema in `src/mcp/schemas.ts`.

Rules:
- prefer strict schemas
- reject unknown input fields unless there is a real reason not to
- keep field names stable and obvious
- update schema tests when changing tool inputs

## Response Rule

Public tools should return:
- `ok: true` success envelopes
- `ok: false` error envelopes

Avoid returning raw process output unless it is deliberately normalized.

## Error Code Rule

If a new failure mode matters to callers, give it an intentional stable code.

Rules:
- prefer existing codes when they already match the failure semantics
- avoid creating near-duplicate codes
- keep messages readable, but do not make tests depend on excessive wording detail

## Documentation Rule

If you change the public surface, update:
- [README.md](../../README.md) if users need to know it
- tests covering schemas, registry, and behavior

If you do not update docs or tests, the contract change is probably incomplete.
