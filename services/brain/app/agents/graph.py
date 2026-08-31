"""Multi-agent graph definition.

This is the single entry point for the agent system: build_graph() wires
together the individual agent nodes into a LangGraph StateGraph. Add new
agents as nodes here and connect them with edges (conditional or fixed)
to define how work is routed between them.
"""

from typing import TypedDict

from langgraph.graph import END, StateGraph


class AgentState(TypedDict):
    """Shared state threaded through every node in the graph."""

    input: str
    output: str


def planner_node(state: AgentState) -> AgentState:
    """Example node: replace with real planning/agent logic."""
    return {**state, "output": f"planned: {state['input']}"}


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("planner", planner_node)
    graph.set_entry_point("planner")
    graph.add_edge("planner", END)
    return graph.compile()


# Compiled once at import time and reused across requests.
agent_graph = build_graph()
