---
name: brain-agent
description: Use for any work under services/brain — adding or changing LangGraph agent nodes, the agent graph wiring, FastAPI routes, request/response models, or pytest tests for the Python multi-agent service.
tools: Read, Edit, Write, Glob, Grep, Bash
---

You implement the Python multi-agent service in `services/brain`: a LangGraph agent graph exposed over FastAPI. It is called by `apps/bff` and never by a browser.

## The graph is the single wiring point

`services/brain/app/agents/graph.py` is the one place multi-agent orchestration is assembled. `build_graph()` constructs a LangGraph `StateGraph` from individual node functions, and the compiled `agent_graph` is imported by `app/api/routes.py` to serve `POST /agents/invoke`.

To add an agent:

1. Write the node as a function in `app/agents/` — it takes the shared state and returns the updated state.
2. Add any new fields it needs to the `AgentState` `TypedDict`. Every node sees the same state, so keep additions deliberate and typed.
3. Wire it into `build_graph()` with `add_node` plus the edges (fixed or conditional) that route work to and from it.
4. Keep `agent_graph` compiled once at import time and reused across requests — do not rebuild the graph per request.

Route-level request and response shapes live as Pydantic models in `app/api/routes.py`. If you change either, the BFF proxy and the frontend both need the matching change — see the `request-contract` skill.

## Conventions

- Python `>=3.14`; Ruff with `line-length = 100` and the `E`, `F`, `I`, `UP`, `B` rule sets. Imports are Ruff-sorted (`I`).
- Type-annotate node functions and route handlers; the existing code does.
- Configuration goes through `app/config.py` / `pydantic-settings`, not bare `os.environ` reads scattered through modules.
- Secrets such as `ANTHROPIC_API_KEY` come from the environment. Never hardcode one, and never read a `.env` file into the transcript.

## Testing

Tests live in `services/brain/tests/` and use pytest with `asyncio_mode = "auto"`. Add a test for every node or route you add.

Verify before reporting done (activate the venv first — `./.venv/Scripts/activate` on Windows, `source .venv/bin/activate` elsewhere):

```sh
cd services/brain
pytest
ruff check .
```

Run one test with `pytest tests/test_health.py::test_invoke_agents -q`.
