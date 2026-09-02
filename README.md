# babata2

Monorepo with three independent apps/services:

- **[apps/web](apps/web)** — React + Vite + TypeScript frontend (SPA).
- **[apps/bff](apps/bff)** — NestJS backend-for-frontend. API only (no UI); called by `apps/web` and proxies to `services/brain`.
- **[services/brain](services/brain)** — Python multi-agent AI service, built with LangGraph and exposed over FastAPI.

Each app manages its own dependencies independently (no workspace tooling linking them).

## Getting started

Each app has its own README/setup — see `apps/web/README.md`, and the commands below.

### Frontend (`apps/web`)

```sh
cd apps/web
pnpm install
cp .env.example .env   # set VITE_BFF_URL
pnpm dev
```

### BFF (`apps/bff`)

```sh
cd apps/bff
pnpm install
pnpm dev   # AI_SERVICE_URL defaults to http://localhost:8000; set it in the environment to override
```

### AI service (`services/brain`)

```sh
cd services/brain
python -m venv .venv
./.venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

### Run everything together

```sh
docker compose up --build
```

This starts `web` on [http://localhost:5173](http://localhost:5173), `bff` on [http://localhost:3000](http://localhost:3000), and `brain` on [http://localhost:8000](http://localhost:8000).
