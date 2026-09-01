---
name: run-stack
description: How to launch this monorepo locally — the three services, their ports, env files, and health checks. Use when asked to run, start, restart, or smoke-test the app, or to confirm a change works in the real stack rather than only in tests.
---

# Running the babata2 stack

Three independently-managed apps. Request flow is `apps/web` → `apps/bff` (`/api/*`) → `services/brain` (`/agents/*`).

| App | Port (local dev) | Health check |
| --- | --- | --- |
| `apps/web` | 5173 | open `http://localhost:5173` |
| `apps/bff` | 3000 | `GET http://localhost:3000/api/health` |
| `services/brain` | 8000 | `GET http://localhost:8000/health` |

Each app has its own lockfile and `node_modules`/`.venv` — always `cd` into the app before running anything, and install per app.

## Docker: the whole stack at once

```sh
docker compose up --build
```

Serves web on `:5173`, bff on `:3000`, brain on `:8000`. Use this when the task is about the three tiers talking to each other. Note that compose passes `services/brain/.env.example` directly as the brain service's `env_file`, so a local `.env` is not picked up there.

## Individual services

Start them bottom-up — the BFF proxies to the brain, and the SPA calls the BFF — and run each in the background so you can keep working while it serves.

**services/brain** (first run needs the venv):

```sh
cd services/brain
python -m venv .venv
./.venv/Scripts/activate        # source .venv/bin/activate on macOS/Linux
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

**apps/bff**:

```sh
cd apps/bff
pnpm install
pnpm dev
```

It reads `AI_SERVICE_URL` (see `apps/bff/lib/env.ts`), defaulting to `http://localhost:8000` when unset — so the brain service on its default port needs no configuration.

**apps/web**:

```sh
cd apps/web
pnpm install
cp .env.example .env       # VITE_BFF_URL=http://localhost:3000
pnpm dev
```

## Smoke test

Check the tiers in order, so a failure tells you which one is at fault:

```sh
curl -s http://localhost:8000/health
curl -s http://localhost:3000/api/health
curl -s -X POST http://localhost:3000/api/agents/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":"hello"}'
```

The last call is the full path through all three tiers of the agent graph. A `502` from it means the BFF is up but cannot reach the brain service — check that uvicorn is running and that `AI_SERVICE_URL` points at it.

## Reporting

Say which services you actually started and what the health checks returned. If a service failed to start, quote its real output rather than describing it. Stop any server you started once the check is done, unless the user asked you to leave it running.
