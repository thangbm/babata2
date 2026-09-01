# Claude Code setup

Project-level configuration for [Claude Code](https://claude.com/claude-code). Committed, so the whole team gets the same behavior. Personal overrides belong in `.claude/settings.local.json`, which is gitignored.

## Layout

```
.claude/
├── settings.json          permission allowlist + .env read denial
├── agents/                subagents, one per tier
├── commands/              slash commands
└── skills/                cross-cutting procedures Claude loads on its own
```

## Agents

Delegated automatically when a task matches, or on request by name.

| Agent | Owns |
| --- | --- |
| `bff-route` | `apps/bff` route handlers; reads the bundled Next.js 16 docs before writing |
| `brain-agent` | `services/brain` LangGraph nodes, graph wiring, FastAPI routes |
| `web-ui` | `apps/web` React components, hooks, and tests |

## Commands

| Command | Does |
| --- | --- |
| `/check [web\|bff\|brain\|all]` | Lint + test + typecheck the apps with changes, and fix failures |
| `/add-agent-node <name> [purpose]` | New LangGraph node, wired into `build_graph()`, with a test |
| `/add-bff-route <path> [method] [purpose]` | New route handler following the proxy pattern, with a test |
| `/trace-flow <feature>` | Read-only trace of one request across all three tiers |

## Skills

Loaded by Claude when the situation calls for them — no need to invoke them by hand.

- **`run-stack`** — ports, env files, startup order, and the end-to-end smoke test. Used when asked to run or verify the app for real.
- **`request-contract`** — the checklist for changing an `/agents/*` payload, which is defined independently in all three tiers with nothing enforcing that they agree.

## Permissions

`settings.json` pre-approves the per-app test, lint, build, and format commands, read-only git, and `docker compose`, so routine verification does not prompt. Reads of `.env` files are denied outright — secrets should never land in a transcript. Commit, push, and other writing git operations are deliberately absent and still prompt.
