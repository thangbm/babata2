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

The proxy in `apps/bff/app/api/agents/invoke/route.ts` currently forwards the parsed body wholesale, so an added request field may reach the brain service without any code change. That is exactly the risk: an unvalidated field crosses the boundary. Validate the new field in the handler — reject a bad payload with `400` rather than letting the brain service receive it.

For a response change, check whether the handler passes the upstream JSON through untouched or reshapes it, and update the route test in the same directory.

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
