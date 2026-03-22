# Docs And Guidance

Use this file when deciding where documentation belongs.

## Ownership Split

- [README.md](../../README.md): package purpose, installation, client setup, public tools, troubleshooting
- [AGENT.md](../../AGENT.md): repo workflow, validation, and contributor expectations
- [.agents/skills/](../skills): detailed repo guidance for specialized areas
- [.agents/plan/](../plan): planning, sequencing, and implementation plans

## Keep README User-Facing

Do include:
- what the package does
- how to install and run it
- how to add it to supported AI clients
- what public tools exist
- high-level troubleshooting

Do not turn README into:
- internal implementation notes
- contributor-only workflow rules
- long-form planning history
- agent-specific behavioral constraints

## Keep AGENT.md Operational

Use [AGENT.md](../../AGENT.md) for:
- TDD rules
- validation commands
- scope constraints
- repo map
- references to deeper skill docs

## When To Add A New Skill Doc

Add a new skill doc when:
- one topic needs more than a short section in `AGENT.md`
- the topic is stable and reusable
- agents will need to consult it repeatedly during implementation

Good candidates:
- folder placement
- public contract changes
- release automation
- test selection rules
- docs ownership
