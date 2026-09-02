---
description: Trace one request end to end across web → bff → brain and report every layer it passes through
argument-hint: <feature, endpoint, or symptom>
allowed-tools: Read, Glob, Grep, Bash
---

Trace `$ARGUMENTS` through all three tiers and report what you find. Read-only — do not change any files.

## Follow the hops

1. **apps/web** — find the call site in `apps/web/src/`. Which component or hook issues it, what URL, what payload, how the response is consumed and how failures are surfaced to the user.
2. **apps/bff** — find the matching controller under `apps/bff/src/`. Which method, what the request DTO validates (and what it silently strips, since the global `ValidationPipe` uses `whitelist: true`), which upstream URL the service reads via `ConfigService`, and how it maps upstream errors to statuses.
3. **services/brain** — find the FastAPI route in `services/brain/app/api/routes.py`, its Pydantic request/response models, and then the path through `app/agents/graph.py`: which nodes run, in what order, and which `AgentState` fields each reads and writes.

## Report

A numbered walkthrough, one step per hop, each citing the exact file and line. Then call out any of these you actually found — do not invent them:

- A shape mismatch between the three layers (a field the frontend sends that the BFF drops, or one the brain returns that nothing reads).
- A missing error path — a failure at one tier that the tier above renders as success or as a blank state.
- Validation at the BFF that's thinner than what the brain service actually requires, meaning unchecked or wrongly-shaped input can still reach it.
- Any place the browser would reach `services/brain` without passing through the BFF.

If a hop does not exist yet, say so plainly and name the file that would have to hold it.
