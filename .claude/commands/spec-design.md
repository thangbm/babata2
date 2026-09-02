---
description: Write specs/<feature-name>/design.md from an approved requirements.md, and stop for approval
argument-hint: <feature-name>
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Write the design for `specs/$ARGUMENTS/`. Load the `spec-driven-development` skill first.

## Steps

1. Read `specs/$ARGUMENTS/requirements.md`. If the folder or file doesn't exist, say so and point at `/spec-create`. If its status line is not `Approved`, stop — show the user what's still `Draft` and ask them to approve or revise `requirements.md` first (if they approve it in this same reply, flip the status line, then continue).
2. Read the conventions for every tier the requirements touch — `apps/bff/src/agents/` and `.claude/agents/bff-route.md` for `bff`, `services/brain/app/agents/graph.py` and `.claude/agents/brain-agent.md` for `brain`, `apps/web/src/` and `.claude/agents/web-ui.md` for `web` — so the design fits existing patterns instead of inventing new ones.
3. Write `specs/$ARGUMENTS/design.md`:

```markdown
# Design — <feature-name>

> Status: **Draft** — awaiting approval

## Overview

<what this design does, in a few sentences, and which tiers it touches: web / bff / brain.>

## Architecture

<the request flow this feature adds or changes, as a short numbered walkthrough across the tiers it touches — same shape as the trace-flow command's output. If it touches only one tier, say so and skip the cross-tier walkthrough.>

## Components and interfaces

### services/brain  (omit this section if untouched)
<new/changed node functions, AgentState fields, Pydantic route models.>

### apps/bff  (omit this section if untouched)
<new/changed controller/service/DTO, upstream calls, error mapping.>

### apps/web  (omit this section if untouched)
<new/changed component/hook, BFF call site, error/loading states.>

## Data contracts

<only if this changes an `/agents/*` request or response shape: say so explicitly and note that implementation must follow the `request-contract` skill's brain → bff → web order. Otherwise write "No cross-tier contract change.">

## Error handling

<what can fail (bad input, unreachable upstream, empty/partial result) and what each tier does about it — status codes, user-visible messaging.>

## Testing strategy

<which test layers this needs per tier: brain pytest, bff unit + e2e specs, web Vitest/Testing Library — see each tier's subagent file for the existing pattern.>

## Traceability

| Requirement | Addressed by |
| --- | --- |
| 1.1 | <component/section above> |
| ... | ... |
```

   Every acceptance criterion from `requirements.md` should appear in the traceability table — if one doesn't map to anything in the design, that's a gap to either fix or flag, not skip silently.

4. Stop. Show the design and ask for approval or changes — do not write `tasks.md` in the same turn.

## Report

State which tiers the design touches, whether it's a cross-tier contract change, and ask explicitly whether it's approved.
