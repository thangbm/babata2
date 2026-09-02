---
name: spec-driven-development
description: The requirements → design → tasks → implementation workflow for building a feature in this repo, gated by explicit human approval between phases. Use whenever asked to spec out, plan, or scope a feature before coding, whenever a specs/<feature>/ folder already exists and work should continue from it, or whenever the user replies to a spec document with an approval or requested change.
---

# Spec-driven development

A feature spec lives at `specs/<feature-name>/` as three documents, written and approved **in order**: `requirements.md`, then `design.md`, then `tasks.md`. Only after `tasks.md` is approved does implementation start, one task at a time, from `/spec-execute`. This exists so that what to build and how to build it are settled — and reviewable by a human — before any code is written, and so a task can be picked up cold (by Claude or a teammate) from the spec files alone, without the original conversation.

Driven by five commands: `/spec-create`, `/spec-design`, `/spec-tasks`, `/spec-execute`, `/spec-status`. Each phase command is also where its document's authoring rules live — this skill covers the parts shared across all of them: the approval gate, the file layout, and how a spec maps onto this repo's three tiers.

## The approval gate

Every spec document opens with a status line:

```markdown
> Status: **Draft** — awaiting approval
```

A phase command will not start until the *previous* phase's document has:

```markdown
> Status: **Approved** (YYYY-MM-DD)
```

Never flip a document to `Approved` yourself just to keep moving — that defeats the point of the gate. Flip it only when the user has actually said so. Approval usually arrives as an ordinary chat reply after a document is written, not as a slash command — a bare "approved", "looks good", "yes, proceed", or specific edits followed by acceptance. Whenever a reply approves a document that is still `Draft`, edit its status line to `Approved` with today's date **before** taking any other action in that reply (including starting the next phase, if the user's approval message also asked for that). Whenever a reply requests changes instead, make the edits and leave the document `Draft` — it needs approval again after changes.

Nothing about this gate is enforced by tooling; it is a discipline the commands and this skill describe. Do not skip it because re-generating a document feels faster than waiting for a reply — the gate is the actual point of doing this at all.

## Layout

```
specs/<feature-name>/
├── requirements.md   EARS-format acceptance criteria, user stories — the "what and why"
├── design.md          architecture, per-tier changes, data contracts — the "how"
└── tasks.md            checklist of discrete coding tasks, each tied to requirement IDs
```

`<feature-name>` is kebab-case and short (`agent-memory`, not `add-persistent-memory-to-the-agent-graph`). `/spec-create` creates the folder; later commands read and edit files inside it. Never hand-edit these files outside a spec command's rules without also fixing the status line, or the gate logic that later commands rely on breaks.

## Mapping a spec onto this repo

This repo is `apps/web` → `apps/bff` (`/api/*`) → `services/brain` (`/agents/*`) — see `CLAUDE.md`. A spec's `design.md` and `tasks.md` should name, per task, which tier(s) it touches, using exactly `web`, `bff`, or `brain` as tags, because `/spec-execute` uses that tag to pick a subagent:

| Tag | Subagent | Tier |
| --- | --- | --- |
| `brain` | `brain-agent` | `services/brain` — LangGraph nodes, graph wiring, FastAPI routes |
| `bff` | `bff-route` | `apps/bff` — NestJS controllers/services/DTOs |
| `web` | `web-ui` | `apps/web` — React components, hooks |

A task spanning more than one tier gets a compound tag (`brain, bff`) and is implemented tier-by-tier in the order `brain` → `bff` → `web` — the same order the `request-contract` skill uses, and for the same reason: `services/brain`'s Pydantic models are the source of truth for a cross-tier payload, so downstream tiers are only correct once it exists. If a spec's design changes the shape of an `/agents/*` request or response, its tasks must follow the `request-contract` skill's checklist, and `design.md` should say so explicitly rather than leave it implied.

## What this skill does not replace

- **`/check`** still runs lint/test/typecheck — `/spec-execute` calls it per task, it does not reimplement it.
- **`trace-flow`** and **`run-stack`** are still the tools for verifying a change against the real running stack once tasks are done; a spec's `design.md` describing the request flow is not a substitute for actually tracing or running it.
- **Subagent files** (`bff-route.md`, `brain-agent.md`, `web-ui.md`) still hold the actual coding conventions for each tier. A spec's `design.md` should cite them, not restate them.
