from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_invoke_agents():
    response = client.post("/agents/invoke", json={"input": "hello"})
    assert response.status_code == 200
    assert response.json() == {"output": "planned: hello"}
