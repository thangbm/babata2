from fastapi import APIRouter
from pydantic import BaseModel

from app.agents.graph import agent_graph

router = APIRouter()


class InvokeRequest(BaseModel):
    input: str


class InvokeResponse(BaseModel):
    output: str


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/agents/invoke", response_model=InvokeResponse)
async def invoke_agents(payload: InvokeRequest) -> InvokeResponse:
    result = agent_graph.invoke({"input": payload.input, "output": ""})
    return InvokeResponse(output=result["output"])
