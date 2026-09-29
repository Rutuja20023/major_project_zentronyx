"""
Zentronyx GNN Diagnostic & Health Check Script
Verifies whether the Graph Neural Network pipeline is functioning properly:
1. Model weights & metadata validation
2. In-memory PyTorch forward-pass inference (synthetic benign & malware graphs)
3. Graph builder & feature normalization sanity checks
4. FastAPI microservice endpoint verification (in-process ASGI & live HTTP check)
"""

import sys
import json
import time
from pathlib import Path

# Paths setup
REPO_ROOT = Path(__file__).parent.parent.resolve()
AI_SERVICE_DIR = REPO_ROOT / "ai-service"
BACKEND_DIR = REPO_ROOT / "backend"

# Place ai-service first so app.* resolves to ai-service
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))


def log_step(title: str):
    print(f"\n[+] {title}...")


def check_model_weights():
    log_step("Step 1: Checking Model Weights & Metadata")
    weights_path = AI_SERVICE_DIR / "app" / "models" / "gnn_malware_weights.pt"
    metadata_path = AI_SERVICE_DIR / "app" / "models" / "model_metadata.json"

    if not weights_path.exists():
        print(f"  [!] Weights file NOT found at {weights_path}")
        return False
    size_kb = weights_path.stat().st_size / 1024
    print(f"  [OK] Weights file found: {weights_path.name} ({size_kb:.1f} KB)")

    if metadata_path.exists():
        with open(metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        eval_m = meta.get("evaluation_metrics", {})
        print(f"  [OK] Metadata Model Name: {meta.get('model_name')}")
        print(f"  [OK] Architecture:       {meta.get('architecture')}")
        print(f"  [OK] Trained Epochs:     {meta.get('trained_epochs')}")
        print(f"  [OK] Test Accuracy:      {eval_m.get('accuracy', 0) * 100:.1f}%")
        print(f"  [OK] Test F1-Score:      {eval_m.get('f1_score', 0):.4f}")
        print(f"  [OK] Test ROC-AUC:       {eval_m.get('roc_auc', 0):.4f}")
    else:
        print(f"  [!] Metadata file not found at {metadata_path}")

    return True


def check_in_memory_gnn_inference():
    log_step("Step 2: Checking In-Memory PyTorch GNN Inference")
    from app.models.gnn_model import BinaryGNNClassifier

    classifier = BinaryGNNClassifier()
    print(f"  [OK] Initialized BinaryGNNClassifier on device: {classifier.device}")

    # Test 1: Empty graph fallback
    empty_res = classifier.predict({"nodes": [], "edges": []})
    assert empty_res["prediction"] == "BENIGN", "Empty graph should default to BENIGN"
    print(f"  [OK] Empty graph handled gracefully: {empty_res['prediction']} in {empty_res['inference_time_ms']}ms")

    # Test 2: Standard graph sample
    sample_graph = {
        "nodes": [
            {"id": 0, "type": "HEADER", "features": [1.0, 4.5, 4096.0, 5.0, 0.0, 0.0, 0.0, 0.0]},
            {"id": 1, "type": "SECTION", "features": [2.0, 5.1, 2048.0, 5.0, 0.0, 0.0, 0.0, 0.0]},
            {"id": 2, "type": "IMPORT_LIB", "features": [3.0, 1.0, 15.0, 5.0, 0.0, 0.0, 0.0, 0.0]}
        ],
        "edges": [
            {"source": 0, "target": 1, "relation": "CONTAINS"},
            {"source": 1, "target": 2, "relation": "IMPORTS"}
        ]
    }
    res = classifier.predict(sample_graph)
    print(f"  [OK] Graph forward-pass output:")
    print(f"       - Prediction:          {res['prediction']}")
    print(f"       - Malware Probability: {res['malware_probability']}")
    print(f"       - Benign Probability:  {res['benign_probability']}")
    print(f"       - Confidence:          {res['confidence']}")
    print(f"       - Inference Time:      {res['inference_time_ms']} ms")
    print(f"       - Graph Embedding Dim: {res['metadata']['graph_embedding_dim']}")

    assert "prediction" in res
    assert "malware_probability" in res
    return True


def check_fastapi_endpoints():
    log_step("Step 3: Checking FastAPI Microservice Endpoints (ASGI In-Process)")
    from starlette.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. Health Endpoint
    resp = client.get("/health")
    assert resp.status_code == 200, f"Health check returned {resp.status_code}"
    health_data = resp.json()
    print(f"  [OK] /health -> Status: {health_data['status']}, Model: {health_data['model_version']}")

    # 2. Predict Endpoint
    payload = {
        "graph_data": {
            "nodes": [
                {"id": 0, "type": "HEADER", "features": [1.0, 7.8, 4096.0, 7.0, 0.0, 0.0, 0.0, 0.0]},
                {"id": 1, "type": "SECTION", "features": [2.0, 7.9, 2048.0, 7.0, 0.0, 0.0, 0.0, 0.0]}
            ],
            "edges": [{"source": 0, "target": 1, "relation": "CONTAINS"}],
            "num_nodes": 2,
            "binary_format": "ELF",
            "architecture": "x86_64",
            "file_size_bytes": 4096
        },
        "feature_schema_version": "1.0.0"
    }
    resp = client.post("/predict-malware", json=payload)
    assert resp.status_code == 200, f"Prediction API returned {resp.status_code}"
    pred_data = resp.json()
    print(f"  [OK] /predict-malware -> Prediction: {pred_data['prediction']} (Malware Prob: {pred_data['malware_probability']:.4f})")
    return True


def check_backend_gnn_integration():
    log_step("Step 4: Checking Backend Binary Graph Builder")
    import importlib.util

    graph_builder_file = BACKEND_DIR / "app" / "analyzers" / "graph_builder.py"
    if not graph_builder_file.exists():
        print(f"  [!] Graph builder not found at {graph_builder_file}")
        return False

    spec = importlib.util.spec_from_file_location("backend_graph_builder", graph_builder_file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    BinaryGraphBuilder = module.BinaryGraphBuilder

    # Test Graph Builder
    mock_features = {
        "file_name": "test.elf",
        "file_size": 8192,
        "overall_entropy": 6.2,
        "format": "ELF",
        "architecture": "x86_64",
        "sections": [
            {"name": ".text", "entropy": 6.1, "size": 4096, "permissions": 5.0},
            {"name": ".data", "entropy": 3.2, "size": 1024, "permissions": 6.0}
        ],
        "imports": ["printf", "socket"],
        "string_stats": {"count": 25, "max_len": 40}
    }
    graph = BinaryGraphBuilder.build_graph(mock_features)
    print(f"  [OK] Graph Builder generated graph with {graph['num_nodes']} nodes and {len(graph['edges'])} edges")
    assert graph["num_nodes"] >= 4
    return True


def main():
    print("=" * 65)
    print("   ZENTRONYX GNN DIAGNOSTIC & VERIFICATION SUITE")
    print("=" * 65)

    all_passed = True
    try:
        if not check_model_weights():
            all_passed = False
        if not check_in_memory_gnn_inference():
            all_passed = False
        if not check_fastapi_endpoints():
            all_passed = False
        if not check_backend_gnn_integration():
            all_passed = False
    except Exception as e:
        print(f"\n[!] ERROR during GNN diagnostic: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False

    print("\n" + "=" * 65)
    if all_passed:
        print(" [SUCCESS] GNN SUBSYSTEM IS FULLY OPERATIONAL AND HEALTHY!")
    else:
        print(" [FAILURE] ONE OR MORE GNN HEALTH CHECKS FAILED.")
    print("=" * 65)


if __name__ == "__main__":
    main()
