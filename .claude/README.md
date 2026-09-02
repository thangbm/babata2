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
| `bff-route` | `apps/bff` NestJS controllers/services/DTOs and their tests |
| `brain-agent` | `services/brain` LangGraph nodes, graph wiring, FastAPI routes |
| `web-ui` | `apps/web` React components, hooks, and tests |

## Commands

| Command | Does |
| --- | --- |
| `/check [web\|bff\|brain\|all]` | Lint + test + typecheck the apps with changes, and fix failures |
| `/add-agent-node <name> [purpose]` | New LangGraph node, wired into `build_graph()`, with a test |
| `/add-bff-route <path> [method] [purpose]` | New route handler following the proxy pattern, with a test |
| `/trace-flow <feature>` | Read-only trace of one request across all three tiers |
| `/spec-create <feature-name> <description>` | New spec: writes `specs/<feature-name>/requirements.md`, stops for approval |
| `/spec-design <feature-name>` | Writes `design.md` from an approved `requirements.md`, stops for approval |
| `/spec-tasks <feature-name>` | Writes `tasks.md` from an approved `design.md`, stops for approval |
| `/spec-execute <feature-name> [task-number]` | Implements, verifies, and checks off one task from an approved `tasks.md` |
| `/spec-status [feature-name]` | Reports phase, approval state, and task progress for one or all specs |

## Skills

Loaded by Claude when the situation calls for them — no need to invoke them by hand.

- **`run-stack`** — ports, env files, startup order, and the end-to-end smoke test. Used when asked to run or verify the app for real.
- **`request-contract`** — the checklist for changing an `/agents/*` payload, which is defined independently in all three tiers with nothing enforcing that they agree.
- **`react-development`** — React 19 patterns and best practices for `apps/web`: current hooks/Actions APIs, when `useEffect` is (and isn't) the right tool, performance, TypeScript, accessibility, and testing conventions. Loaded whenever component or hook code is being written or reviewed, not just when something's broken.
- **`spec-driven-development`** — the requirements → design → tasks → implementation workflow behind the `/spec-*` commands: the human-approval gate between phases, the `specs/<feature-name>/` file layout, and how a task's `(tier: ...)` tag maps to a subagent. See `specs/README.md` for the folder itself.

## Permissions

`settings.json` pre-approves the per-app test, lint, build, and format commands, read-only git, and `docker compose`, so routine verification does not prompt. Reads of `.env` files are denied outright — secrets should never land in a transcript. Commit, push, and other writing git operations are deliberately absent and still prompt.
