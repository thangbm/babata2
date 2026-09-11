# Design — container-stack

> Status: **Approved** (2026-09-11)

## Overview

This design makes the existing three-service compose stack actually build, start, and connect. It changes container configuration only — `docker-compose.yml`, the three `Dockerfile`s, two `.dockerignore`s, and the `run-stack` skill. **No application source changes in any tier**, so the usual `web` / `bff` / `brain` code conventions are untouched; the tier tags below refer to each app's container config.

Four defects are in scope, in the order they would bite a developer running `docker compose up --build` today:

1. **The brain image cannot build.** `services/brain/Dockerfile` pins `python:3.12-slim`, but `pyproject.toml` declares `requires-python = ">=3.14"`. `pip install .` refuses, so the build fails before any wiring problem is reachable (R6.1).
2. **The BFF points at a host that does not exist.** `AI_SERVICE_URL: http://ai:8000`; the service is named `brain` (R1.2).
3. **The web bundle has no BFF URL.** `apps/web/Dockerfile` never passes `VITE_BFF_URL` into the build stage, so `import.meta.env.VITE_BFF_URL` is `undefined` in the shipped bundle (R3.1).
4. **Nothing reports health.** No healthchecks, no readiness gating, no restart policy (R4).

## Architecture

There is no new request path — this design makes the documented one work. The walkthrough below is what `docker compose up --build` does once fixed, and where each requirement lands:

1. **Build** — Compose builds three images. `brain` installs on a Python interpreter that satisfies `requires-python` (R6.1); `web` receives `VITE_BFF_URL` as a build arg and bakes it into the bundle (R3.1–R3.2); each build context excludes local `.env` files so image contents don't vary by machine (R6.3–R6.4).
2. **Start `brain`** — Compose loads `services/brain/.env.example` then, if present, `services/brain/.env`; later values win, so a real key overrides the placeholder (R2.1, R2.4). Its healthcheck polls `GET /health` from inside the container using Python's stdlib (R4.1, R7.1).
3. **Gate `bff`** — `depends_on: brain: condition: service_healthy` holds `bff` until that check passes (R4.2). If it never passes, `bff` never starts and `docker compose ps` shows `brain` unhealthy (R7.3).
4. **Start `bff`** — with `AI_SERVICE_URL: http://brain:8000`, resolved by Compose's DNS on the default network (R1.2). Its own healthcheck polls `GET /api/health` (R4.1).
5. **Start `web`** — nginx serves the built bundle on container port 80, published as host `5173` (R1.4). It depends on `bff` only as `service_started`: nginx serves static files and never calls the BFF itself — the *browser* does, at runtime — so gating on `bff` health would add startup latency for no benefit.
6. **Verify** — `POST http://localhost:3000/api/agents/invoke` traverses host → `bff` → `brain` and returns the brain's output rather than a `502` (R1.3).

## Components and interfaces

### services/brain (container config only — `brain`)

`services/brain/Dockerfile`:

- `FROM python:3.12-slim` → **`python:3.14-slim`**, satisfying `requires-python = ">=3.14"` (R6.1). Align *up* to the declared requirement rather than relaxing `pyproject.toml` down, because `>=3.14` is the deliberate convention recorded in `.claude/agents/brain-agent.md`.
- No other change. The existing selective `COPY pyproject.toml` + `COPY app ./app` already keeps `.env` out of the image; `.dockerignore` gains `.env` as defense in depth for when that `COPY` inevitably broadens (R2.3, R6.3).

`docker-compose.yml` — the `brain` service:

```yaml
  brain:
    build: ./services/brain
    ports:
      - "8000:8000"
    env_file:
      - path: ./services/brain/.env.example
        required: true
      - path: ./services/brain/.env
        required: false
    healthcheck:
      test: ["CMD", "python", "-c",
             "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=2)"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped
```

Two points that are easy to get wrong:

- **`env_file` list order is the override order** — later entries win, which is exactly R2.4, and `required: false` is what lets the stack start with no `.env` at all (R2.2). This long-form `env_file` syntax needs Docker Compose **v2.24+**; v5.1.3 is present on this machine, but the prerequisite gets documented (R5.3).
- **The healthcheck uses `python`, not `curl`** — the Debian-slim base ships neither `curl` nor `wget` (R7.1). `urllib.request.urlopen` raises a non-zero exit on any non-2xx or connection error, which is precisely the semantics a healthcheck needs.

Publishing `8000` to the host contradicts the "brain is internal" rule in `CLAUDE.md` in spirit, but is retained deliberately: `run-stack`'s smoke test and F0.4's script both check brain health directly, and this compose file is a development artifact. A production deployment would drop that `ports` entry.

### apps/bff (container config only — `bff`)

`apps/bff/Dockerfile`: unchanged. `.dockerignore` gains `.env`, `.env.local` (R6.3).

`docker-compose.yml` — the `bff` service:

```yaml
  bff:
    build: ./apps/bff
    ports:
      - "3000:3000"
    environment:
      AI_SERVICE_URL: http://brain:8000
      PORT: "3000"
    depends_on:
      brain:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 5s
    restart: unless-stopped
```

`AI_SERVICE_URL` is consumed by `ConfigService` in `apps/bff/src/agents/agents.service.ts`, which already defaults to `http://localhost:8000` when unset — the compose value simply overrides it for the containerized case. `PORT` is set explicitly to match `src/main.ts`'s default, so the published port and the listening port can't silently drift apart. The healthcheck uses busybox `wget` (present in `node:22-alpine`, unlike `curl`) with `--spider` for a body-less request (R7.1).

### apps/web (container config only — `web`)

`apps/web/Dockerfile` — the build stage gains the arg:

```dockerfile
FROM base AS build
ARG VITE_BFF_URL=http://localhost:3000
ENV VITE_BFF_URL=$VITE_BFF_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
```

`ARG` must be declared **inside the stage that consumes it** — a top-level `ARG` would not be visible here. It is promoted to `ENV` because Vite reads `VITE_`-prefixed values from the process environment at build time, and its default matches `apps/web/.env.example` so the zero-config build behaves as documented (R3.2–R3.3).

`apps/web/.dockerignore` gains `.env` and `.env.local`. This is not cosmetic: the stage's `COPY . .` currently copies a developer's local `apps/web/.env` into the build context, where Vite would load it in preference to the build arg — meaning the same commit produces different bundles on different machines (R6.3–R6.4).

`docker-compose.yml` — the `web` service:

```yaml
  web:
    build:
      context: ./apps/web
      args:
        VITE_BFF_URL: ${VITE_BFF_URL:-http://localhost:3000}
    ports:
      - "5173:80"
    depends_on:
      bff:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s
    restart: unless-stopped
```

The `${VITE_BFF_URL:-…}` interpolation lets a different host/port be supplied from the environment without editing any file (R3.2).

**Deliberate non-change:** no nginx SPA-fallback config (`try_files $uri /index.html`) is added. `apps/web` has no client-side router today, so nothing 404s; adding routing without the fallback would break deep links, which makes it the `chat-ui` spec's concern in Phase 1, at the moment it first matters.

## Data contracts

**No cross-tier contract change.** The `/agents/*` request and response shapes are untouched, so the `request-contract` skill does not apply here.

## Error handling

| Failure | Behavior | Requirement |
| --- | --- | --- |
| `brain` never becomes healthy | `bff` stays unstarted; `docker compose ps` shows `brain` unhealthy after `start_period` + `retries × interval` (≈60s), bounded rather than hanging | R7.2, R7.3 |
| `services/brain/.env` absent | Stack starts on `.env.example` defaults; no error | R2.2 |
| Both env files define a variable | `.env` wins by list order | R2.4 |
| `brain` crashes after startup | `unless-stopped` restarts it; `bff` keeps running and returns `502` for invoke calls in the gap, per its existing `toBadGateway` mapping | R4.3 |
| Host port already in use | Compose fails at start with a port-binding error naming the service; ports stay as documented rather than being auto-assigned | R1.4 |
| `VITE_BFF_URL` unset at build | Build-arg default `http://localhost:3000` applies | R3.3 |
| Healthcheck tool missing from image | Prevented by design — each check uses only its own base image's tooling | R7.1 |

## Testing strategy

This spec ships no application code, so it has no pytest/Vitest surface. Verification is at the container layer instead, and the three checks below are the acceptance evidence:

1. **Config validity** — `docker compose config` parses and resolves (catches the `env_file` long-form syntax against the installed Compose version).
2. **Clean build** — `docker compose build --no-cache` from a clone with no `.env` files present; all three images build (R6.2). This is the check that would have caught the Python version defect.
3. **Runtime smoke** — bring the stack up, confirm `docker compose ps` reports all three healthy, then run the `run-stack` smoke sequence: brain `GET /health` → bff `GET /api/health` → `POST /api/agents/invoke` returning `200` with the brain's output (R1.3). Additionally: stop `brain`, confirm the invoke call returns `502` rather than hanging, and confirm the container comes back on its own.

Automating all of this is deliberately out of scope — `stack-smoke-test` (F0.4) turns step 3 into a committed script, and `ci-pipeline` (F0.5) runs it per PR. Until then these are documented manual steps in the `run-stack` skill.

**Regression risk to check explicitly:** `pnpm dev` in `apps/web` must still read `apps/web/.env` (R8.1) — the `.dockerignore` addition affects the Docker build context only and must not be mistaken for a change to local dev.

## Traceability

| Requirement | Addressed by |
| --- | --- |
| 1.1 | All of the below — the build and start path end to end |
| 1.2 | `bff` service: `AI_SERVICE_URL: http://brain:8000` |
| 1.3 | Testing strategy step 3 (runtime smoke) |
| 1.4 | `ports` retained as `5173:80`, `3000:3000`, `8000:8000` |
| 2.1 | `brain` service: two-entry `env_file` list |
| 2.2 | `env_file` entry `required: false` on `.env` |
| 2.3 | `.dockerignore` additions (brain, bff, web); no `.gitignore` weakening |
| 2.4 | `env_file` list ordering — later entry wins |
| 3.1 | `apps/web/Dockerfile` build-stage `ARG`/`ENV VITE_BFF_URL` |
| 3.2 | Compose `build.args` with `${VITE_BFF_URL:-…}` interpolation |
| 3.3 | `ARG VITE_BFF_URL=http://localhost:3000` default, matching `.env.example` |
| 4.1 | `healthcheck` blocks on `bff` and `brain` |
| 4.2 | `bff` `depends_on: brain: condition: service_healthy` |
| 4.3 | `restart: unless-stopped` on all three services |
| 4.4 | `web` healthcheck block |
| 5.1 | `run-stack` skill update (Docker section) |
| 5.2 | `run-stack` smoke sequence kept accurate; Testing strategy step 3 |
| 5.3 | `run-stack` states the Compose v2.24+ prerequisite |
| 6.1 | `services/brain/Dockerfile`: `python:3.14-slim` |
| 6.2 | Testing strategy step 2 (clean `--no-cache` build) |
| 6.3 | `.dockerignore` additions across all three apps |
| 6.4 | `.dockerignore` excluding `apps/web/.env` so the build arg is authoritative |
| 7.1 | `python -c urllib.request` for brain; busybox `wget` for bff and web |
| 7.2 | `interval`/`timeout`/`retries`/`start_period` on every healthcheck |
| 7.3 | `service_healthy` gating + Error handling row 1 |
| 8.1 | Build arg confined to the image build; `.env` loading in `pnpm dev` untouched |
| 8.2 | `run-stack` individual-service sections left accurate |
| 8.3 | No change to `app/config.py` or `pydantic-settings` behavior |

## Out of scope, noted while reviewing

- `services/brain/pyproject.toml` sets `[tool.ruff] target-version = "py311"` while `requires-python` is `>=3.14` — a real inconsistency, but it affects lint rule selection only, not the container. Worth a separate chore; fixing it here would blur this spec's boundary.
- `apps/bff`'s runtime stage copies the full `node_modules` including devDependencies, inflating the image. An optimization, not a defect — it does not stop the stack working.
