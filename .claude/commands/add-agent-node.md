---
description: Add a new LangGraph agent node to services/brain and wire it into the graph
argument-hint: <node-name> [what the node should do]
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Add a new agent node to the multi-agent graph in `services/brain`. Node name and purpose: `$ARGUMENTS`. If the purpose is missing or too vague to implement, ask before writing code.

Delegate the implementation to the `brain-agent` subagent, or do it yourself following the same rules.

## Steps

1. Read `services/brain/app/agents/graph.py` first — `planner_node` and `AgentState` are the pattern to match.
2. Create the node function in `services/brain/app/agents/`. One module per agent, named after the node. It takes `AgentState` and returns the updated state.
3. Add any fields the node needs to the `AgentState` `TypedDict`. Every node shares this state, so keep additions minimal and typed.
4. Wire it into `build_graph()`: `add_node`, then the edges that route work to and from it. Decide explicitly whether the edge is fixed or conditional, and say which you chose and why.
5. Add a pytest test under `services/brain/tests/` covering the node in isolation, plus the graph path through it if the routing is conditional.
6. Verify: `ruff check .` and `pytest` from `services/brain` with the venv active.

## Constraints

- `agent_graph` stays compiled once at import time — never rebuild it per request.
- Do not change the `POST /agents/invoke` request or response shape as a side effect. If the new node genuinely requires a contract change, stop and follow the `request-contract` skill, which covers the matching BFF and frontend updates.
