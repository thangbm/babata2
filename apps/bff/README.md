# bff

NestJS backend-for-frontend. API-only — no UI. Validates requests from
`apps/web` and proxies them to `services/brain`; the AI service stays
internal and is never called directly from the browser.

## Endpoints

- `GET /api/health` — liveness check, returns `{ "status": "ok" }`.
- `POST /api/agents/invoke` — validates `{ "input": string }`, forwards to
  `services/brain`'s `POST /agents/invoke`, and returns its response
  verbatim (status and body). An unreachable or erroring upstream is
  mapped to `502 { "error": string }`.

## Configuration

- `AI_SERVICE_URL` — base URL of `services/brain`. Defaults to `http://localhost:8000`.

## Getting started

```sh
pnpm install
pnpm dev   # nest start --watch, http://localhost:3000
```

## Commands

```sh
pnpm build                                          # nest build -> dist/
pnpm start                                           # node dist/main.js
pnpm lint
pnpm format
pnpm test                                            # vitest run
pnpm vitest run src/health/health.controller.spec.ts # single test file
```
