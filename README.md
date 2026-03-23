# Local Expo MCP

`local-expo-mcp` is a single user-visible MCP server for local Expo workflows.

It gives agents one local MCP surface for:
- Expo project inspection
- Metro start, stop, restart, status, logs, and recent error summaries
- local Android-capable Expo runs
- hidden `expo-mcp` attach after Metro is healthy
- device listing and logs
- screenshots, app launch, app terminate, and foreground-app inspection through hidden `mobile-mcp`
- session summaries for the current project

## Scope

Current validated scope is Windows-first local development.

Today:
- Windows is actively implemented and tested
- macOS is deferred
- Linux is not yet validated
- EAS is intentionally out of scope

## Why It Exists

Using `expo-mcp` and `mobile-mcp` directly means the user has to manage multiple MCP servers and their startup order. `local-expo-mcp` keeps that orchestration internal:
- one public MCP server only
- direct control of Expo CLI and `adb`
- lazy hidden child MCP startup only when needed
- structured results instead of raw terminal output

## Installation

Requirements:
- Node 20+
- local Expo tooling for the projects you want to work on
- Android tooling on PATH if you want `adb` fallbacks or local Android runs

Run it locally with `npx` once published:

```bash
npx local-expo-mcp
```

For repo development:

```bash
bun install
bun run build
node dist/server.js
```

## Add It To Your AI Client

`local-expo-mcp` is a local stdio MCP server. In practice, every client needs the same core launch command:

```text
command: npx
args: [-y, local-expo-mcp]
```

If a client can run a local stdio MCP server with a command and args array, it can usually run `local-expo-mcp`.

### General MCP Pattern

For clients that support generic stdio MCP configuration, use this shape:

```json
{
  "mcpServers": {
    "local-expo": {
      "command": "npx",
      "args": ["-y", "local-expo-mcp"]
    }
  }
}
```

If the client is on native Windows and cannot launch `npx` directly, use a command wrapper that the client supports, for example:

```json
{
  "mcpServers": {
    "local-expo": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "local-expo-mcp"]
    }
  }
}
```

### Claude

Claude Code supports local stdio MCP servers. Anthropic documents both CLI-based setup and JSON configuration.

Claude Code CLI, native Windows-safe form:

```bash
claude mcp add --transport stdio local-expo -- cmd /c npx -y local-expo-mcp
```

Claude Code CLI, typical macOS/Linux form:

```bash
claude mcp add --transport stdio local-expo -- npx -y local-expo-mcp
```

Claude project config via `.mcp.json`:

```json
{
  "mcpServers": {
    "local-expo": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "local-expo-mcp"]
    }
  }
}
```

Claude Desktop config uses the same `mcpServers` JSON shape. On Windows that file is typically `%APPDATA%\Claude\claude_desktop_config.json`.

### Codex

Codex supports MCP in its shared CLI and IDE config.

Codex CLI command:

```bash
codex mcp add local-expo -- npx -y local-expo-mcp
```

Project-scoped `.codex/config.toml`:

```toml
[mcp_servers.local-expo]
command = "npx"
args = ["-y", "local-expo-mcp"]
startup_timeout_sec = 30
tool_timeout_sec = 120
enabled = true
```

Local repo development example:

```toml
[mcp_servers.local-expo]
command = "node"
args = ["dist/server.js"]
startup_timeout_sec = 30
tool_timeout_sec = 120
enabled = true
```

Useful commands:

```bash
codex mcp list
codex mcp get local-expo
```

### Gemini

Gemini CLI supports MCP servers through `~/.gemini/settings.json`.

Gemini CLI command:

```bash
gemini mcp add local-expo npx -y local-expo-mcp
```

If your Windows Gemini setup cannot launch `npx` directly, use:

```bash
gemini mcp add local-expo cmd /c npx -y local-expo-mcp
```

Example `settings.json`:

```json
{
  "mcpServers": {
    "local-expo": {
      "command": "npx",
      "args": ["-y", "local-expo-mcp"],
      "timeout": 30000
    }
  }
}
```

If your Windows Gemini setup cannot launch `npx` directly, use:

```json
{
  "mcpServers": {
    "local-expo": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "local-expo-mcp"],
      "timeout": 30000
    }
  }
}
```

After configuring it, restart Gemini CLI and inspect MCP status from the CLI.

### OpenCode

OpenCode supports local MCP servers in `opencode.json` or `opencode.jsonc`.

OpenCode CLI command:

```bash
opencode mcp add
```

This will prompt you for the server details. Choose `local` (stdio) and provide the command `npx` with arguments `-y local-expo-mcp`.

Example `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "local-expo": {
      "type": "local",
      "command": ["npx", "-y", "local-expo-mcp"],
      "enabled": true,
      "timeout": 120000
    }
  }
}
```

OpenCode also exposes MCP helper commands such as `opencode mcp list`.

## Public Tools

Current public tools:
- `project_inspect`
- `metro_start`
- `metro_stop`
- `metro_restart`
- `metro_status`
- `metro_logs_recent`
- `metro_errors_recent`
- `dev_server_attach`
- `android_run`
- `device_list`
- `device_logs_recent`
- `device_screenshot`
- `device_app_launch`
- `device_app_terminate`
- `device_foreground_app`
- `session_summary`

All tools return structured JSON-like data. Failures use this envelope:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable summary",
    "details": {}
  }
}
```

## Development

Common commands:

```bash
bun install
bun run build
bun run commitlint
bunx vitest run
bun run test:windows
bun run test:live:windows
bun run test:acceptance
```

Live repro apps live under `test/live-projects/`.

Repo-specific contributor and agent guidance lives in [AGENT.md](AGENT.md).

## Testing

This repo ships with:
- non-live unit and integration coverage
- Windows-specific test coverage
- required Windows live Metro coverage
- repo-owned live Expo smoke projects for regression reproduction

If you are working inside this repo, use the validation guidance in [AGENT.md](AGENT.md).

## CI and Publishing

This repo includes:
- CI for install, commitlint, tests, and build
- a PR-based release workflow in [release.yml](.github/workflows/release.yml)
- Trusted Publisher (GitHub OIDC) so npm publishing runs without a static `NPM_TOKEN`
- Dependabot for npm and GitHub Actions updates

### Release Process

This repo does not publish directly from a feature PR merge. It uses a two-step flow so `main` stays PR-only:

1. Merge a normal PR into `main` with the `publish` label.
2. The release workflow updates `release/next` with:
   - the next version in [package.json](package.json)
   - the pending release entry in [CHANGELOG.md](CHANGELOG.md)
   - the pending release state file `.release-plan.json`
3. The workflow creates or updates a PR from `release/next` into `main`.
4. Review and merge that release PR.
5. After the `release/next` PR is merged, the workflow:
   - runs build and tests again
   - publishes to npm with OIDC
   - creates or updates the GitHub release and tag

Version selection is based on the merged PR title/body using conventional-commit style rules:
- `feat:` -> minor
- `fix:` and `perf:` -> patch
- `feat!:` or `BREAKING CHANGE:` -> major
- `refactor:`, `build:`, and `ci:` can still produce a patch release
- `docs:` and `test:` alone do not create a release PR

If multiple publish-labeled PRs merge before `release/next` is merged, the pending release PR is updated and the version is escalated as needed.

## Troubleshooting

If `metro_start` fails:
- verify the target project is a local Expo project
- verify the selected port is free
- inspect `metro_logs_recent`

If `android_run` fails:
- inspect the structured Gradle summary
- inspect recent device logs
- verify local Android SDK and `adb` availability

If hidden MCP attachment fails:
- start Metro first
- confirm the dev server URL was detected
- verify local dependencies were installed successfully

## Sources For Client Config Examples

These client setup examples were checked against current documentation on March 22, 2026:
- Anthropic Claude Code MCP docs: https://code.claude.com/docs/en/mcp
- OpenAI Docs MCP guide for Codex MCP configuration examples: https://developers.openai.com/learn/docs-mcp
- Gemini CLI repository docs pointing to `~/.gemini/settings.json`: https://github.com/google-gemini/gemini-cli
- OpenCode MCP server docs: https://opencode.ai/docs/mcp-servers/

## Note

This MCP has been engineered heavily with the aid of AI agents, with human review guiding the architecture, implementation, testing, and release workflow decisions.

