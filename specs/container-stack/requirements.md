# Requirements — container-stack

> Status: **Draft** — awaiting approval

## Introduction

The repo already has a `Dockerfile` per app (`apps/web`, `apps/bff`, `services/brain`) and a root `docker-compose.yml`, but the compose file has not actually been exercised end to end: it wires the BFF's upstream URL to a compose service (`ai`) that doesn't exist (the brain service is named `brain`), and it gives the brain container no way to receive a real API key. This spec hardens the existing container setup so `docker compose up --build` reliably brings up all three tiers, wired to each other correctly, and reachable from the host — the "everything together" row of `CLAUDE.md`'s commands. It touches all three tiers' container config plus the root compose file; no application code changes.

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
3. WHEN a container's process is killed or crashes THE compose `restart` policy SHALL bring it back up automatically in a non-dev context, without requiring `docker compose up` to be re-run by hand.

### Requirement 5: Documentation matches reality

**User Story:** As a developer, I want the docs that describe running the stack in containers to match what the compose file actually does, so following them doesn't reproduce the bugs this spec fixes.

#### Acceptance Criteria

1. THE `run-stack` skill's "Docker: the whole stack at once" section SHALL be updated to describe the corrected `AI_SERVICE_URL` wiring, the `web` build-arg, and the `services/brain/.env` override path — not just the current one-line caveat about `.env.example`.
2. IF a developer follows only `run-stack` and `CLAUDE.md` (no other context) WHEN bringing up the stack via compose THEN they SHALL reach a working end-to-end smoke test (`services/brain` health → `bff` health → `POST /api/agents/invoke`) using only documented steps.
