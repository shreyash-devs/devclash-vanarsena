from fastapi.testclient import TestClient
from app.main import app

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "ollama_hosts" in data
        assert "neo4j" in data
        print("Health Check Passed!")

if __name__ == "__main__":
    test_health_check()
