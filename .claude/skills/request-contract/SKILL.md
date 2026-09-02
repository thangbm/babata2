---
name: request-contract
description: The checklist for changing a payload that crosses tiers in this monorepo — a field added to or removed from an agent invoke request or response. Use whenever a change to services/brain's route models or the BFF's proxy payload would leave the frontend, BFF, and brain service disagreeing about a shape.
---

# Changing a cross-tier contract

A request shape here is defined in three places at once, and nothing in the repo enforces that they agree — there is no shared schema package, no codegen, and no workspace tooling linking the apps. A field added in one tier and forgotten in another fails silently: the BFF forwards a payload the brain service ignores, or returns a field nothing reads.

So treat any change to an `/agents/*` request or response as a change to all three tiers, in this order.

## 1. `services/brain` — the source of truth

The Pydantic models in `services/brain/app/api/routes.py` (`InvokeRequest`, `InvokeResponse`) define the contract. Change them first, then make the graph actually produce or consume the new field:

- A new request field usually needs a matching field on the `AgentState` `TypedDict` in `app/agents/graph.py`, and the invoke route must thread it into `agent_graph.invoke(...)` — the current call passes an explicit dict, so a new state field silently defaults to nothing unless it is added there.
- A new response field must be read out of the graph result and returned, not just present in state.

Add or update a pytest test in `services/brain/tests/` that asserts the new shape.

## 2. `apps/bff` — forward and validate

The DTO in `apps/bff/src/agents/dto/invoke-agent.dto.ts` (`InvokeAgentDto`) is what actually gets validated — the global `ValidationPipe` in `src/main.ts` rejects anything that doesn't match it with `400` before `apps/bff/src/agents/agents.controller.ts`/`agents.service.ts` ever forward the request. A new request field needs a matching `class-validator`-decorated property on the DTO, or it's silently stripped (`whitelist: true`) rather than forwarded — decide deliberately whether that's what you want.

For a response change, `AgentsService.invoke` currently forwards the upstream JSON body untouched — check whether that's still correct or whether the new field needs shaping, and update `agents.service.spec.ts` / `agents.controller.spec.ts` / `test/agents.e2e-spec.ts` alongside it.

## 3. `apps/web` — send and consume

Update the call site in `apps/web/src/` to send the new field and to read the new response field, including the case where it is absent — a deployed BFF may still be on the old shape. Update the Vitest test alongside it.

## 4. Verify all three

```sh
cd services/brain && ruff check . && pytest
cd apps/bff && pnpm lint && pnpm test
cd apps/web && pnpm lint && pnpm test && pnpm build
```

Then exercise the real path end to end — see the `run-stack` skill for the `curl` against `POST /api/agents/invoke`. Tests in three separate suites cannot catch a mismatch between them; only the live call can.

## Report

State explicitly which of the three tiers you changed. If you deliberately left one alone, say so and why — a silent omission here is the failure mode this checklist exists to prevent.
