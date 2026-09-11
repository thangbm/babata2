# Requirements — container-stack

> Status: **Approved** (2026-09-11)

## Introduction

The repo already has a `Dockerfile` per app (`apps/web`, `apps/bff`, `services/brain`) and a root `docker-compose.yml`, but the compose file has not actually been exercised end to end: it wires the BFF's upstream URL to a compose service (`ai`) that doesn't exist (the brain service is named `brain`), and it gives the brain container no way to receive a real API key. This spec hardens the existing container setup so `docker compose up --build` reliably brings up all three tiers, wired to each other correctly, and reachable from the host — the "everything together" row of `CLAUDE.md`'s commands. It touches all three tiers' container config plus the root compose file; no application source changes.

Requirements 1–5 were drafted from the compose file alone. Requirements 6–8 were added after reviewing the three `Dockerfile`s and `.dockerignore`s, which surfaced a **blocking build defect** (`services/brain/Dockerfile` pins `python:3.12-slim` while `pyproject.toml` declares `requires-python = ">=3.14"`, so `pip install .` fails and the brain image never builds), plus two adjacent risks: healthchecks that assume tools the base images do not ship, and the chance that introducing a build arg breaks the non-container `pnpm dev` path.

**Scope boundary.** This spec fixes what is broken in the existing three-service stack. Adding Postgres and Redis is `datastore-foundation` (F0.2), which will also introduce a liveness/readiness split and **supersede criterion 4.1's choice of `GET /health`** for the brain healthcheck. Automating the smoke test is `stack-smoke-test` (F0.4); running it in CI is `ci-pipeline` (F0.5).

## Requirements

### Requirement 1: Compose brings up all three tiers correctly networked

**User Story:** As a developer, I want `docker compose up --build` to start web, bff, and brain wired to each other correctly, so that the full request path (`web` → `bff` → `brain`) works without any manual fix-up.

#### Acceptance Criteria

1. WHEN `docker compose up --build` is run from the repo root THE stack SHALL build and start all three services without a config error.
2. THE `bff` service's `AI_SERVICE_URL` SHALL resolve to the actual `brain` service on the compose network (not the nonexistent `ai` hostname currently in `docker-compose.yml`).
3. WHEN a request is made to `POST http://localhost:3000/api/agents/invoke` on the running stack THE response SHALL come from the containerized `brain` service (not a `502`), proving the `bff` → `brain` hop actually resolves inside the compose network.
4. THE compose file SHALL keep the documented host ports (`5173` for web, `3000` for bff, `8000` for brain) unchanged, since `CLAUDE.md` and the `run-stack` skill already document them.

### Requirement 2: Brain container receives real configuration, not a hardcoded example file

**User Story:** As a developer, I want to supply a real `ANTHROPIC_API_KEY` (or other secret) to the containerized brain service, so that the container isn't permanently locked to placeholder configuration.

#### Acceptance Criteria

1. THE `brain` service's compose config SHALL allow a real `services/brain/.env` (git-ignored, not committed) to supply secrets at container runtime, in addition to the non-secret defaults `services/brain/.env.example` already documents.
2. IF `services/brain/.env` does not exist WHEN `docker compose up` is run THEN THE stack SHALL still start successfully using `.env.example`'s non-secret defaults (`HOST`, `PORT`), same as today.
3. THE change SHALL NOT weaken `.gitignore`/`.dockerignore` secret handling already in place — a real `.env` must never be baked into an image layer or committed.
4. WHERE both `.env.example` and `.env` supply the same variable THE value from `.env` SHALL win, so a real secret overrides the placeholder rather than depending on file ordering a developer has to guess.

### Requirement 3: Web container serves a build reachable from the browser

**User Story:** As a developer, I want the containerized `web` app's build to call the BFF at an address the browser can actually resolve, so that the containerized frontend works instead of failing on every API call.

#### Acceptance Criteria

1. WHEN the `web` image is built THE build SHALL bake in a `VITE_BFF_URL` that is resolvable from the host browser (e.g. `http://localhost:3000`), not a compose-internal service name like `http://bff:3000` that only resolves inside the Docker network.
2. THE `web` service's Dockerfile and `docker-compose.yml` SHALL make this value overridable (a build arg) rather than hardcoded, so a deployment on a different host/port doesn't require editing the Dockerfile.
3. IF no override is given WHEN the `web` image is built THEN THE default SHALL match `apps/web/.env.example`'s local-dev value, so the zero-config path matches today's documented behavior.

### Requirement 4: Startup and health are observable

**User Story:** As a developer, I want `docker compose ps` and container health status to reflect whether each service is actually ready to serve traffic, so that a broken container is visibly broken rather than silently accepting connections before it's ready.

#### Acceptance Criteria

1. THE `bff` and `brain` services SHALL each define a compose `healthcheck` that calls their existing health endpoint (`GET /api/health`, `GET /health`).
2. THE `bff` service's `depends_on` on `brain` SHALL use `condition: service_healthy`, so `bff` is only marked started after `brain` is actually accepting requests.
3. THE compose `restart` policy for every service SHALL be `unless-stopped`, so a crashed container returns automatically while an explicit `docker compose stop` is still respected.
4. THE `web` service SHALL also define a healthcheck, so `docker compose ps` reports health for all three services rather than leaving one blank.

### Requirement 5: Documentation matches reality

**User Story:** As a developer, I want the docs that describe running the stack in containers to match what the compose file actually does, so following them doesn't reproduce the bugs this spec fixes.

#### Acceptance Criteria

1. THE `run-stack` skill's "Docker: the whole stack at once" section SHALL be updated to describe the corrected `AI_SERVICE_URL` wiring, the `web` build-arg, and the `services/brain/.env` override path — not just the current one-line caveat about `.env.example`.
2. IF a developer follows only `run-stack` and `CLAUDE.md` (no other context) WHEN bringing up the stack via compose THEN they SHALL reach a working end-to-end smoke test (`services/brain` health → `bff` health → `POST /api/agents/invoke`) using only documented steps.
3. THE documentation SHALL state the minimum Docker Compose version required by the compose file's syntax, so a developer on an older CLI gets a clear prerequisite instead of a parse error.

### Requirement 6: Every image builds from a clean checkout

**User Story:** As a developer, I want `docker compose build` to succeed on a freshly cloned repo with no local files of my own, so that the stack is reproducible rather than dependent on one machine's state.

#### Acceptance Criteria

1. THE `services/brain` image SHALL be built on a Python version that satisfies `pyproject.toml`'s `requires-python` constraint. *(Today it does not: the Dockerfile pins `python:3.12-slim` against a `>=3.14` requirement, so `pip install .` fails and the image cannot build at all.)*
2. WHEN `docker compose build --no-cache` is run on a clean clone with no `.env` files present THEN all three images SHALL build successfully.
3. THE build context for each app SHALL exclude local environment files (`.env`, `.env.local`), so an image's contents do not vary with whatever env files happen to exist on the builder's machine.
4. IF a developer has a local `apps/web/.env` THEN the built `web` image SHALL still use the `VITE_BFF_URL` build arg's value, not the developer's local file, so builds are reproducible across machines.

### Requirement 7: Health checks are self-contained and bounded

**User Story:** As a developer, I want a health check to actually report health, so that `depends_on: service_healthy` gates on real readiness instead of stalling on a check that could never have passed.

#### Acceptance Criteria

1. EACH healthcheck command SHALL use only tooling present in that service's own base image — none of `nginx:alpine`, `node:22-alpine`, or the brain's Python base image ships `curl`, so a check invoking it would fail permanently and report the service unhealthy forever.
2. EACH healthcheck SHALL define `interval`, `timeout`, `retries`, and `start_period`, so a service that is merely slow to boot is not marked unhealthy and a service that is genuinely broken is reported within a bounded time.
3. IF the `brain` service never becomes healthy THEN `bff` SHALL remain unstarted and `docker compose ps` SHALL show `brain` as unhealthy, so the failure is visible at the point of failure rather than surfacing later as a confusing `502`.

### Requirement 8: The non-container development path keeps working

**User Story:** As a developer who runs the three services directly rather than in Docker, I want this spec's container changes to leave my workflow untouched, so that hardening compose doesn't cost me my inner loop.

#### Acceptance Criteria

1. WHEN `pnpm dev` is run in `apps/web` after this change THE app SHALL still read `VITE_BFF_URL` from `apps/web/.env` exactly as documented today — the build arg SHALL apply to image builds only.
2. THE individual-service instructions in the `run-stack` skill SHALL remain accurate for `apps/web`, `apps/bff`, and `services/brain` run outside Docker.
3. WHERE `services/brain` is run directly with `uvicorn` THE local `.env` loading behavior via `pydantic-settings` SHALL be unchanged.
