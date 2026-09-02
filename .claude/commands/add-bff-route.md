---
description: Add a NestJS controller endpoint to apps/bff, with a DTO, validation, and tests, following the existing agents module pattern
argument-hint: <resource, e.g. agents/status> [GET|POST] [what it does]
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Add an endpoint to `apps/bff`. Resource, method, and purpose: `$ARGUMENTS`. If the purpose is missing or too vague to implement, ask before writing code.

Delegate the implementation to the `bff-route` subagent, or do it yourself following the same rules.

## Steps

1. Read `apps/bff/src/agents/` in full first (`agents.controller.ts`, `agents.service.ts`, `dto/invoke-agent.dto.ts`, `agents.module.ts`) — that is the house pattern for a validated proxy endpoint. `apps/bff/src/health/` shows the minimal case (controller only, no service) if the new endpoint has no real logic.
2. Decide whether this belongs in an existing module or needs a new one. A new module gets its own directory under `apps/bff/src/`, registered in `apps/bff/src/app.module.ts`'s `imports`.
3. If the endpoint accepts a body, add a `class-validator`-decorated DTO under `<module>/dto/`. The global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`, set in `src/main.ts`) rejects anything that doesn't match it with `400` — don't hand-roll validation in the controller.
4. If the endpoint calls an upstream, read its base URL via `ConfigService` in the service's constructor (see `AgentsService`), not `process.env` directly. Use native `fetch`, not `@nestjs/axios`, unless the call genuinely needs interceptors/retries.
5. Map upstream failures to a real status with a real body: throw `new HttpException({ error: message }, HttpStatus.BAD_GATEWAY)` (or the fitting status) from the service, not a raw `Error` — an object response body on `HttpException` is sent verbatim as JSON.
6. Remember the controller's `@Controller(...)` path is relative to the global `api` prefix set in `main.ts` — don't bake `api/` into it.
7. Add unit specs (`*.controller.spec.ts`, `*.service.spec.ts`) mirroring `agents.controller.spec.ts`/`agents.service.spec.ts`, and extend or add an e2e spec under `apps/bff/test/` mirroring `agents.e2e-spec.ts` — the e2e layer is what actually proves the wire-level status/body, not the unit specs.
8. Verify: `cd apps/bff && pnpm test && pnpm lint && pnpm build`.

## Constraints

- Nothing here may make `services/brain` reachable from the browser. No redirect, rewrite, or passthrough that forwards an arbitrary upstream path.
- Return errors as JSON with a real status code — `502` for an unreachable upstream, `400` for a payload that fails validation (the `ValidationPipe` gives you this one for free).
