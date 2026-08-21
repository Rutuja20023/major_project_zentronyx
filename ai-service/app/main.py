import logging
from typing import Dict, Any
from fastapi import FastAPI, status, HTTPException
from app.schemas.predict import MalwarePredictRequest, MalwarePredictResponse
from app.models.gnn_model import BinaryGNNClassifier

logger = logging.getLogger("zentronyx.ai_service")

app = FastAPI(
    title="Zentronyx AI Security Microservice",
    description="GNN Binary Malware Classification & Graph Machine Learning Microservice Engine",
    version="1.0.0"
)

gnn_classifier = BinaryGNNClassifier()


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "service": "zentronyx-ai-microservice",
        "model_version": gnn_classifier.model_version,
        "feature_schema_version": gnn_classifier.feature_schema_version,
        "device": "CPU",
        "loaded_model": "BinaryGNNClassifier (GCN/PyG)"
    }


@app.post(
    "/predict-malware",
    response_model=MalwarePredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["GNN Malware Inference"],
    summary="Perform GNN malware prediction over binary graph representation"
)
async def predict_malware(req: MalwarePredictRequest):
    """
    Validates graph representation & feature schema, executes PyG GNN model inference,
    and returns structured malware prediction result.
    """
    try:
        graph_dict = req.graph_data.model_dump()
        result = gnn_classifier.predict(graph_dict)
        return MalwarePredictResponse(
            prediction=result["prediction"],
            malware_probability=result["malware_probability"],
            benign_probability=result["benign_probability"],
            confidence=result["confidence"],
            model_version=result["model_version"],
            feature_schema_version=result["feature_schema_version"],
            inference_time_ms=result["inference_time_ms"],
            metadata=result.get("metadata", {})
        )
    except Exception as e:
        logger.error(f"GNN Inference Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"GNN inference execution failed: {str(e)}"
        )


@app.post(
    "/api/v1/predict",
    response_model=MalwarePredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["Inference Alias"],
    summary="Legacy compatible predict endpoint alias"
)
async def predict_alias(req: MalwarePredictRequest):
    return await predict_malware(req)
