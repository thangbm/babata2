# Tasks — container-stack

> Status: **Approved**

Ordered so that dependencies land first: the brain image must build before any healthcheck
or `service_healthy` gate can pass, so task 1 comes before everything. No task changes
application source — all edits are container config, root compose, or docs.

> **Note on tier tags.** Tasks 2, 4 and 6 edit the root `docker-compose.yml`, and task 7
> edits `.claude/skills/run-stack/SKILL.md`. Neither file lives inside a tier, so no tier
> subagent owns them — the tag on a compose task names the *service being configured*, for
> ordering and review, not a delegation target. `/spec-execute` should implement these
> directly rather than dispatching to `brain-agent`/`bff-route`/`web-ui`.

- [ ] 1. Fix the brain image's Python version and exclude env files from its build context (tier: brain) — Requirements: 6.1, 6.2, 6.3, 2.3
  - `services/brain/Dockerfile`: `FROM python:3.12-slim` → `FROM python:3.14-slim`. This is the blocking defect — `pip install .` currently fails against `requires-python = ">=3.14"`, so nothing else in this spec is verifiable until it lands.
  - `services/brain/.dockerignore`: add `.env`. Defense in depth; the existing selective `COPY pyproject.toml` + `COPY app ./app` already keeps it out today.
  - Verify with `docker build ./services/brain` alone before moving on.

- [x] 2. Configure the `brain` service in compose: env-file layering, healthcheck, restart policy (tier: brain — root `docker-compose.yml`) — Requirements: 2.1, 2.2, 2.4, 4.1, 4.3, 7.1, 7.2, 1.4
  - Replace the single `env_file` string with the two-entry long-form list from `design.md`: `.env.example` (`required: true`) then `.env` (`required: false`). Order is the override order, which is what satisfies 2.4.
  - Healthcheck must use `python -c "import urllib.request; urllib.request.urlopen(...)"` — the Debian-slim base ships neither `curl` nor `wget`, so a `curl`-based check would report unhealthy forever (7.1).
  - Set `interval`/`timeout`/`retries`/`start_period` per the design (7.2), `restart: unless-stopped` (4.3), and keep `8000:8000` (1.4).

- [x] 3. Exclude env files from the BFF build context (tier: bff) — Requirements: 6.3
  - `apps/bff/.dockerignore`: add `.env` and `.env.local` alongside the existing `node_modules`/`dist`.

- [x] 4. Fix the `bff` service's upstream wiring and add health gating (tier: bff — root `docker-compose.yml`) — Requirements: 1.2, 4.1, 4.2, 4.3, 7.1, 7.2, 7.3, 1.4
  - `AI_SERVICE_URL: http://ai:8000` → `http://brain:8000` — the original defect this spec exists for (1.2). Also set `PORT: "3000"` explicitly so the published and listening ports cannot drift.
  - `depends_on` becomes the long form with `brain: condition: service_healthy` (4.2), which is also what makes 7.3 observable: if brain never goes healthy, bff never starts.
  - Healthcheck uses busybox `wget --spider -q http://localhost:3000/api/health` (present in `node:22-alpine`, unlike `curl`), with the timing fields from the design.

- [x] 5. Pass `VITE_BFF_URL` into the web build and exclude env files from its context (tier: web) — Requirements: 3.1, 3.3, 6.3, 6.4
  - `apps/web/Dockerfile`: add `ARG VITE_BFF_URL=http://localhost:3000` and `ENV VITE_BFF_URL=$VITE_BFF_URL` **inside the `build` stage** — a top-level `ARG` would not be visible there. Default matches `apps/web/.env.example` (3.3).
  - `apps/web/.dockerignore`: add `.env` and `.env.local`. Not cosmetic — the stage's `COPY . .` currently copies a developer's local `.env` into the context, where Vite prefers it over the build arg, so the same commit builds differently per machine (6.4).
  - Confirm the built bundle actually contains the URL (e.g. grep the emitted asset) rather than assuming the arg took effect.

- [x] 6. Configure the `web` service in compose: build arg, healthcheck, restart policy (tier: web — root `docker-compose.yml`) — Requirements: 3.2, 4.3, 4.4, 7.1, 7.2, 1.4
  - `build` becomes the long form with `context: ./apps/web` and `args: VITE_BFF_URL: ${VITE_BFF_URL:-http://localhost:3000}`, so the value is overridable from the environment without editing a file (3.2).
  - Add the `wget --spider` healthcheck against `http://localhost/` (4.4), `restart: unless-stopped` (4.3), keep `5173:80` (1.4).
  - Keep `depends_on: bff: condition: service_started` — nginx serves static files and never calls the BFF itself, so gating on bff health would only add startup latency.

- [x] 7. Update the `run-stack` skill to match the fixed stack (tier: none — repo docs) — Requirements: 5.1, 5.3, 8.2
  - Rewrite the "Docker: the whole stack at once" section: the corrected `AI_SERVICE_URL` wiring, the `VITE_BFF_URL` build arg and how to override it, and the `services/brain/.env` override path. Delete the now-false caveat that a local `.env` "is not picked up there" (5.1).
  - State the **Docker Compose v2.24+** prerequisite required by the long-form `env_file` syntax (5.3).
  - Leave the individual-service (non-Docker) sections intact and verify they are still accurate (8.2).

- [ ] 8. Verify the whole stack end to end and record the results (tier: none — verification) — Requirements: 1.1, 1.3, 6.2, 7.3, 5.2, 8.1, 8.3
  - `docker compose config` parses; `docker compose build --no-cache` succeeds on a checkout with no `.env` files present (6.2).
  - `docker compose up`, then `docker compose ps` shows all three services healthy; run the `run-stack` smoke sequence and confirm `POST /api/agents/invoke` returns `200` with the brain's output, not a `502` (1.1, 1.3, 5.2).
  - Failure modes: stop `brain` and confirm the invoke call returns `502` rather than hanging, and that the container returns on its own; separately confirm a deliberately unhealthy `brain` leaves `bff` unstarted and visibly unhealthy in `docker compose ps` (7.3).
  - Regression check: `pnpm dev` in `apps/web` still reads `apps/web/.env`, and `uvicorn` in `services/brain` still loads its local `.env` via `pydantic-settings` — the `.dockerignore` additions must not have touched either path (8.1, 8.3).
