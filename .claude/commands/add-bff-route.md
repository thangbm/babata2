---
description: Add a Next.js route handler to apps/bff, with a test, following the existing proxy pattern
argument-hint: <api path, e.g. agents/status> [GET|POST] [what it does]
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Add a route handler to `apps/bff`. Path, method, and purpose: `$ARGUMENTS`. If the purpose is missing or too vague to implement, ask before writing code.

Delegate the implementation to the `bff-route` subagent, or do it yourself following the same rules.

## Steps

1. **Read the bundled docs first.** `apps/bff` is Next.js 16 and differs from older Next.js conventions. Read `apps/bff/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (and the `backend-for-frontend` guide for a proxy route) before writing anything. Resolve `node_modules` from `apps/bff`, not the repo root.
2. Read `apps/bff/app/api/agents/invoke/route.ts` — that is the house pattern for a proxy route, including its error handling.
3. Create `apps/bff/app/api/<path>/route.ts` exporting the named method handler.
4. If the route calls an upstream, take the base URL from a named export in `apps/bff/lib/env.ts` — add one if needed. Do not read `process.env` inside the handler.
5. Validate the incoming payload before forwarding. Validation belongs here, in the BFF; `services/brain` trusts what it receives.
6. Add `apps/bff/app/api/<path>/route.test.ts` that imports the module and calls the exported handler directly — no server. Mirror `app/api/health/route.test.ts`.
7. Verify: `cd apps/bff && pnpm test && pnpm lint`.

## Constraints

- Nothing here may make `services/brain` reachable from the browser. No redirect, rewrite, or passthrough that forwards an arbitrary upstream path.
- Return errors as JSON with a real status code — `502` for an unreachable upstream, `400` for a payload that fails validation.
- Leave `apps/bff/AGENTS.md` in place if `next dev` regenerates it; commit it with your work.
