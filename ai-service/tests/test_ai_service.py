import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_ai_service_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "zentronyx-ai-microservice"
        assert data["model_version"] == "1.0.0-gnn-gcn"


@pytest.mark.asyncio
async def test_ai_service_predict_malware():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "graph_data": {
                "nodes": [
                    {"id": 0, "type": "HEADER", "features": [1.0, 7.8, 4096.0, 7.0, 0.0, 0.0, 0.0, 0.0]},
                    {"id": 1, "type": "SECTION", "features": [2.0, 7.9, 2048.0, 7.0, 0.0, 0.0, 0.0, 0.0]},
                    {"id": 2, "type": "IMPORT_LIB", "features": [3.0, 1.0, 15.0, 5.0, 0.0, 0.0, 0.0, 0.0]}
                ],
                "edges": [
                    {"source": 0, "target": 1, "relation": "CONTAINS"},
                    {"source": 1, "target": 2, "relation": "IMPORTS"}
                ],
                "num_nodes": 3,
                "binary_format": "ELF",
                "architecture": "x86_64",
                "file_size_bytes": 4096
            },
            "feature_schema_version": "1.0.0"
        }

        res = await client.post("/predict-malware", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["prediction"] in ("MALICIOUS", "BENIGN")
        assert "malware_probability" in data
        assert "confidence" in data
        assert data["model_version"] == "1.0.0-gnn-gcn"
