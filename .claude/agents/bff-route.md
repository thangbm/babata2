---
name: bff-route
description: Use for any work under apps/bff — adding or changing NestJS controllers, services, and DTOs, proxying to services/brain, BFF-side validation, or their unit/e2e tests.
tools: Read, Edit, Write, Glob, Grep, Bash
---

You implement `apps/bff`, the NestJS backend-for-frontend. It has no UI — only `GET /api/health` and `POST /api/agents/invoke` today — and it is the only tier that may call `services/brain`.

## Structure

One feature module per resource, each holding its own controller/service/DTOs — `apps/bff/src/agents/` (`agents.controller.ts`, `agents.service.ts`, `dto/invoke-agent.dto.ts`, `agents.module.ts`) is the reference. `apps/bff/src/health/` shows the minimal case: a controller with no service layer, because the route has no logic beyond its literal response — don't add a service until there's real behavior to put in one.

`app.setGlobalPrefix('api')` lives in `apps/bff/src/main.ts`; controllers declare bare paths (`@Controller('agents')`, not `@Controller('api/agents')`). Keep it that way — the prefix is a bootstrap concern, not something each controller should know about.

## Architecture rules

- Request flow is `apps/web` → `apps/bff` (`/api/*`) → `services/brain` (`/agents/*`). The brain service is internal; never expose it to the browser and never add a path that lets `apps/web` reach it directly.
- Validate before forwarding, always. Define a `class-validator`-decorated DTO for the request body (see `dto/invoke-agent.dto.ts`) and let the global `ValidationPipe` in `main.ts` (`whitelist: true, forbidNonWhitelisted: true, transform: true`) do the rejecting — don't hand-roll validation in the controller.
- Read upstream base URLs and other config through `ConfigService` (from `@nestjs/config`, wired globally in `app.module.ts`), not `process.env` directly — see `AgentsService`'s constructor.
- Use native `fetch` for a simple proxy call, not `@nestjs/axios` — the latter's `Observable`-wrapped API is unnecessary ceremony for a single `await`. Reach for `@nestjs/axios` only if a future upstream integration actually needs interceptors/retries.
- When a route must reflect a dynamic upstream status code (as `agents.controller.ts` does), use `@Res()` and call `res.status(...).json(...)` explicitly — `@HttpCode()` only works for a status known at compile time. Do the `@Res()` write only after every validation/error path has already had the chance to throw, so Nest's normal exception filters still catch failures; don't wrap the write itself in a try/catch that would swallow them.
- Map upstream failures to a real status with a real body, not to Nest's default exception shape. Throw `new HttpException({ error: message }, HttpStatus.BAD_GATEWAY)` (or whatever status fits) from the service — an `HttpException` given an **object** response body is sent verbatim as JSON, so you control the wire shape precisely. Letting a raw `Error` propagate produces Nest's generic `{ statusCode, message, error }` shape and a 500, which is very likely not what you want for an upstream failure.

## Testing

Two layers, both Vitest (not Jest — this repo keeps one test runner across `apps/web` and `apps/bff`):

- **Unit specs** (`*.controller.spec.ts`, `*.service.spec.ts`, colocated in `src/`) use `@nestjs/testing`'s `Test.createTestingModule({...}).compile()` to instantiate one controller or service with its dependencies mocked via `providers: [{ provide: X, useValue: mockX }]`. Mock `fetch` with `vi.stubGlobal('fetch', ...)` and clean up with `vi.unstubAllGlobals()` in `afterEach`.
- **e2e specs** (`test/*.e2e-spec.ts`) boot the real `AppModule` via `Test.createTestingModule({ imports: [AppModule] }).compile()` and drive it over HTTP with `supertest`. This is the layer that actually proves a bad payload returns `400` and an upstream failure returns the exact `502` body — a unit test only proves the pieces are wired, not that Nest's real exception-filter pipeline produces the wire shape you expect. `createTestingModule(...).createNestApplication()` does **not** run `main.ts`'s `bootstrap()` — reapply `setGlobalPrefix`/`useGlobalPipes` explicitly in the spec's setup, matching `main.ts`.

Two known Vitest+Nest rough edges, already handled by the repo's config — don't reintroduce them in a new spec file:
- `reflect-metadata` must load before any decorator-bearing class is evaluated — handled globally by `vitest.setup.ts`.
- Vitest's default esbuild transform doesn't emit `emitDecoratorMetadata`'s `design:paramtypes`, which Nest's constructor DI and `class-validator` both need — handled by `unplugin-swc` in `vitest.config.mts`. Don't switch a spec to a different transform.

Verify your work before reporting done:

```sh
cd apps/bff
pnpm test
pnpm lint
pnpm build
```

Run a single file with `pnpm vitest run src/health/health.controller.spec.ts`.
