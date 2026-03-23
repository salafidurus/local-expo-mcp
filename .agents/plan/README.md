# Agent Plans

This directory contains the historical and active plans for the `local-expo-mcp` project. Each plan uses YAML frontmatter to track its metadata and current status.

## Plan Metadata

Each plan file starts with a metadata block:

```yaml
---
title: Name of the plan
status: pending | in_progress | completed | deferred | cancelled
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

## List of Plans

| # | Plan | Status | Updated |
| :--- | :--- | :--- | :--- |
| 1 | [Project Init Plan](1-project-init-plan.md) | `completed` | 2026-03-23 |
| 1.1 | [Windows Implementation](1-project-init-implementation-windows.md) | `completed` | 2026-03-23 |
| 1.2 | [macOS Implementation](1-project-init-implementation-mac.md) | `deferred` | 2026-03-23 |
| 2 | [Robustness and Reliability Overhaul](2-robustness-and-reliability-overhaul.md) | `completed` | 2026-03-23 |

## Usage

- **Pending:** The plan has been created but work has not yet started.
- **In Progress:** Work is actively being performed according to this plan.
- **Completed:** All tasks in the plan have been fulfilled and verified.
- **Deferred:** Work is intentionally postponed (e.g., waiting for a specific environment).
- **Cancelled:** The plan is no longer relevant.
