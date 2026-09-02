# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is a monorepo with three independently-managed apps (plain folders, no pnpm/turbo workspace tooling — each app has its own lockfile and `node_modules`/`.venv`):

- `apps/web` — React + Vite + TypeScript frontend (SPA). No backend logic; talks to the BFF only.
- `apps/bff` — NestJS "backend for frontend". API-only (controllers under `src/*/`, one feature module per resource — see `src/agents/`); has no real user-facing UI. This is the only piece the frontend calls directly, and the only piece that calls `services/brain`.
- `services/brain` — Python multi-agent AI service. FastAPI app exposing a LangGraph agent graph over HTTP; called by `apps/bff`, never called directly by `apps/web`.

Request flow: `apps/web` → `apps/bff` (`/api/*`) → `services/brain` (`/agents/*`). Keep it that way — the AI service is internal and should not be exposed to the browser directly; add new upstream calls as BFF controllers/services that validate before forwarding (see `apps/bff/src/agents/agents.controller.ts` + `agents.service.ts` for the pattern: a `class-validator` DTO, a global `ValidationPipe`, and an explicit `HttpException` mapping an unreachable upstream to `502`).

Each app's own env template documents what it needs: `apps/web/.env.example` and `services/brain/.env.example`. Copy to `.env` per app; `docker-compose.yml` wires the three together with the right internal URLs for a full local run. `apps/bff` has no `.env.example` — its only settings are `AI_SERVICE_URL` and `PORT`, read via `@nestjs/config`'s `ConfigService` (see `apps/bff/src/agents/agents.service.ts` and `src/main.ts`) with a `http://localhost:8000` / `3000` default respectively.

### `services/brain` — agent graph entry point

`services/brain/app/agents/graph.py` is the single place multi-agent orchestration is wired up: `build_graph()` constructs a LangGraph `StateGraph` from individual node functions. Add new agents as node functions in `app/agents/` and wire them into `build_graph()`'s nodes/edges; the compiled `agent_graph` is invoked from `app/api/routes.py` (`POST /agents/invoke`), which is what `apps/bff`'s proxy route calls.

## Commands

### apps/web (React/Vite)

```sh
cd apps/web
pnpm install
pnpm dev              # dev server
pnpm build             # tsc -b && vite build
pnpm lint              # eslint .
pnpm format             # prettier --write .
pnpm test               # vitest run (single run)
pnpm test:watch          # vitest watch mode
pnpm vitest run src/App.test.tsx   # single test file
```

### apps/bff (NestJS)

```sh
cd apps/bff
pnpm install
pnpm dev              # nest start --watch
pnpm build             # nest build -> dist/main.js
pnpm lint              # eslint
pnpm format             # prettier --write .
pnpm test               # vitest run (unit specs under src/, e2e specs under test/)
pnpm vitest run src/health/health.controller.spec.ts   # single test file
```

Unit specs use `@nestjs/testing`'s `Test.createTestingModule` to instantiate one controller/service in isolation (see `apps/bff/src/health/health.controller.spec.ts`); e2e specs under `test/` boot the real `AppModule` and drive it over HTTP with `supertest` (see `apps/bff/test/agents.e2e-spec.ts`) — the e2e spec is what actually proves a validation failure returns `400` and an upstream failure returns `502 { error }` over the wire, not just from a unit assertion. Vitest needs `unplugin-swc` as its transform (plain esbuild doesn't emit the `design:paramtypes` metadata Nest's DI and `class-validator` depend on) — see `apps/bff/vitest.config.mts`.

### services/brain (Python / FastAPI / LangGraph)

```sh
cd services/brain
python -m venv .venv
./.venv/Scripts/activate        # source .venv/bin/activate on macOS/Linux
pip install -e ".[dev]"
uvicorn app.main:app --reload    # dev server
pytest                            # all tests
pytest tests/test_health.py -q    # single test file
pytest tests/test_health.py::test_invoke_agents -q   # single test
ruff check .                       # lint
```

### Everything together

```sh
docker compose up --build   # web on :5173, bff on :3000, brain on :8000
```

`apps/bff`'s Dockerfile builds with `nest build` (output: `dist/main.js`) and runs `pnpm start` (`node dist/main.js`) — no framework dev-server dependency at runtime.

## Claude Code setup

`.claude/` holds this project's committed agents, slash commands, skills, and permission allowlist — see `.claude/README.md` for what each one covers.

## Spec-driven development

Non-trivial features go through `specs/<feature-name>/` before any code is written: `requirements.md` (EARS-format acceptance criteria) → `design.md` (per-tier architecture) → `tasks.md` (a checklist of discrete, tier-tagged coding tasks), each requiring explicit human approval before the next phase starts or implementation begins. Driven by `/spec-create`, `/spec-design`, `/spec-tasks`, `/spec-execute`, and `/spec-status` — see the `spec-driven-development` skill and `specs/README.md`.
