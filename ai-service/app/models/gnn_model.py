import os
import time
import math
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, List, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger("zentronyx.ai_service.gnn_model")


def compute_normalized_adj(num_nodes: int, edges: List[Dict[str, Any]], device: torch.device) -> torch.Tensor:
    """
    Computes symmetrically normalized adjacency matrix with self-loops:
    A_hat = D^(-1/2) * (A + I) * D^(-1/2)
    """
    if num_nodes <= 0:
        return torch.eye(1, dtype=torch.float32, device=device)

    adj = torch.zeros((num_nodes, num_nodes), dtype=torch.float32, device=device)
    for e in edges:
        s = e.get("source", 0)
        t = e.get("target", 0)
        if 0 <= s < num_nodes and 0 <= t < num_nodes:
            adj[s, t] = 1.0
            adj[t, s] = 1.0  # Symmetrical undirected graph for message passing

    # Add self-loops (A + I)
    adj_hat = adj + torch.eye(num_nodes, dtype=torch.float32, device=device)

    # Compute degree matrix D
    deg = torch.sum(adj_hat, dim=1)
    deg_inv_sqrt = torch.pow(deg, -0.5)
    deg_inv_sqrt[torch.isinf(deg_inv_sqrt)] = 0.0
    d_mat = torch.diag(deg_inv_sqrt)

    # Symmetric normalization: D^(-1/2) * A_hat * D^(-1/2)
    norm_adj = torch.matmul(torch.matmul(d_mat, adj_hat), d_mat)
    return norm_adj


def normalize_node_features(x: torch.Tensor) -> torch.Tensor:
    """
    Normalizes heterogeneous node features into a standardized [0, 1] numerical space.
    Handles log-scaling for section/file sizes and bounded scaling for entropy and permissions.
    """
    x_norm = x.clone()
    if x_norm.size(1) >= 1:
        x_norm[:, 0] = x_norm[:, 0] / 5.0  # Node type (1-5)
    if x_norm.size(1) >= 2:
        x_norm[:, 1] = x_norm[:, 1] / 8.0  # Shannon entropy (0-8)
    if x_norm.size(1) >= 3:
        x_norm[:, 2] = torch.log10(torch.clamp(x_norm[:, 2], min=0.0) + 1.0) / 7.0  # Size in bytes
    if x_norm.size(1) >= 4:
        x_norm[:, 3] = x_norm[:, 3] / 7.0  # Permission flags (0-7)
    return x_norm


class GraphConvLayer(nn.Module):
    """
    Graph Convolution Layer implementing spectral graph convolution:
    H^(l+1) = norm_adj * H^(l) * W_neigh + H^(l) * W_self + bias
    """
    def __init__(self, in_features: int, out_features: int, bias: bool = True):
        super(GraphConvLayer, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.weight = nn.Parameter(torch.Tensor(in_features, out_features))
        self.self_weight = nn.Parameter(torch.Tensor(in_features, out_features))
        if bias:
            self.bias = nn.Parameter(torch.Tensor(out_features))
        else:
            self.register_parameter('bias', None)
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.weight)
        nn.init.xavier_uniform_(self.self_weight)
        if self.bias is not None:
            nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor, norm_adj: torch.Tensor) -> torch.Tensor:
        # x: [N, in_features], norm_adj: [N, N]
        support = torch.matmul(x, self.weight)         # [N, out_features]
        neigh_agg = torch.matmul(norm_adj, support)     # [N, out_features]
        self_feat = torch.matmul(x, self.self_weight)  # [N, out_features]
        out = neigh_agg + self_feat
        if self.bias is not None:
            out = out + self.bias
        return out


class MalwareGNN(nn.Module):
    """
    Deep Graph Neural Network for Static Binary Code Property Graph Malware Classification.
    
    Architecture:
      Standardized Feature Normalizer
      -> GCN Layer 1 (8 -> 64) + BatchNorm + LeakyReLU + Dropout(0.2)
      -> GCN Layer 2 (64 -> 64) + BatchNorm + LeakyReLU + Dropout(0.2)
      -> GCN Layer 3 (64 -> 64) + BatchNorm + LeakyReLU
      -> Global Graph Readout Pooling: [MeanPool(H) || MaxPool(H)] in R^(128)
      -> Classifier Head (MLP): Linear(128 -> 64) -> LeakyReLU -> Dropout -> Linear(64 -> 2)
    """
    def __init__(self, in_features: int = 8, hidden_dim: int = 64, num_classes: int = 2, dropout: float = 0.2):
        super(MalwareGNN, self).__init__()
        self.in_features = in_features
        self.hidden_dim = hidden_dim
        self.num_classes = num_classes
        self.dropout = dropout

        # Graph Convolutional Layers
        self.conv1 = GraphConvLayer(in_features, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)

        self.conv2 = GraphConvLayer(hidden_dim, hidden_dim)
        self.bn2 = nn.BatchNorm1d(hidden_dim)

        self.conv3 = GraphConvLayer(hidden_dim, hidden_dim)
        self.bn3 = nn.BatchNorm1d(hidden_dim)

        # Classification MLP
        self.fc1 = nn.Linear(hidden_dim * 2, 64)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x: torch.Tensor, norm_adj: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass for a single graph instance.
        x: [N, in_features], norm_adj: [N, N]
        Returns: logits [1, num_classes], graph_embedding [1, 2*hidden_dim]
        """
        num_nodes = x.size(0)

        # 0. Feature normalization
        x_norm = normalize_node_features(x)

        # Layer 1
        h1 = self.conv1(x_norm, norm_adj)
        if num_nodes > 1:
            h1 = self.bn1(h1)
        h1 = F.leaky_relu(h1, negative_slope=0.1)
        h1 = F.dropout(h1, p=self.dropout, training=self.training)

        # Layer 2
        h2 = self.conv2(h1, norm_adj)
        if num_nodes > 1:
            h2 = self.bn2(h2)
        h2 = F.leaky_relu(h2, negative_slope=0.1)
        h2 = F.dropout(h2, p=self.dropout, training=self.training)

        # Layer 3
        h3 = self.conv3(h2, norm_adj)
        if num_nodes > 1:
            h3 = self.bn3(h3)
        h3 = F.leaky_relu(h3, negative_slope=0.1)

        # Global Readout: Mean + Max pooling over node dimension
        mean_pool = torch.mean(h3, dim=0, keepdim=True)       # [1, hidden_dim]
        max_pool, _ = torch.max(h3, dim=0, keepdim=True)      # [1, hidden_dim]
        graph_embed = torch.cat([mean_pool, max_pool], dim=1) # [1, 2 * hidden_dim]

        # Classification Head
        fc_out = self.fc1(graph_embed)
        fc_out = F.leaky_relu(fc_out, negative_slope=0.1)
        fc_out = F.dropout(fc_out, p=self.dropout, training=self.training)
        logits = self.fc2(fc_out)                             # [1, 2]

        return logits, graph_embed


class BinaryGNNClassifier:
    """
    Production GNN Inference Adapter for FastAPI AI Service.
    Wraps trained PyTorch MalwareGNN model and performs real-time graph inference.
    """
    def __init__(self, in_features: int = 8, hidden_dim: int = 64, num_classes: int = 2):
        self.in_features = in_features
        self.hidden_dim = hidden_dim
        self.num_classes = num_classes
        self.model_version = "1.0.0-gnn-gcn"
        self.feature_schema_version = "1.0.0"
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = MalwareGNN(
            in_features=self.in_features,
            hidden_dim=self.hidden_dim,
            num_classes=self.num_classes
        ).to(self.device)

        self._load_or_initialize_weights()

    def _load_or_initialize_weights(self):
        """Attempts to load pre-trained model weights from standard locations."""
        possible_paths = [
            Path(__file__).parent / "gnn_malware_weights.pt",
            Path(__file__).parent.parent.parent / "models" / "gnn_malware_weights.pt",
            Path(__file__).parent.parent / "gnn_malware_weights.pt"
        ]

        loaded = False
        for p in possible_paths:
            if p.exists():
                try:
                    state_dict = torch.load(str(p), map_location=self.device)
                    self.model.load_state_dict(state_dict)
                    self.model.eval()
                    logger.info(f"Loaded trained GNN weights from {p}")
                    loaded = True
                    break
                except Exception as e:
                    logger.warning(f"Failed to load weights from {p}: {e}")

        if not loaded:
            logger.info("No pre-trained weights file found. Initialized MalwareGNN with default Xavier weights.")
            self.model.eval()

    def predict(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes real PyTorch GNN inference over input binary graph representation.
        Returns prediction, malware_probability, benign_probability, confidence, inference_time_ms.
        """
        start_time = time.perf_counter()

        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])
        num_nodes = len(nodes)

        if num_nodes == 0:
            return {
                "prediction": "BENIGN",
                "malware_probability": 0.01,
                "benign_probability": 0.99,
                "confidence": 0.99,
                "model_version": self.model_version,
                "feature_schema_version": self.feature_schema_version,
                "inference_time_ms": round((time.perf_counter() - start_time) * 1000, 2),
                "metadata": {"reason": "Empty graph data"}
            }

        # 1. Build Feature Matrix X [num_nodes, in_features]
        feature_list = []
        for n in nodes:
            feats = n.get("features", [0.0] * self.in_features)
            # Pad or truncate to in_features (8)
            if len(feats) < self.in_features:
                feats = feats + [0.0] * (self.in_features - len(feats))
            elif len(feats) > self.in_features:
                feats = feats[:self.in_features]
            feature_list.append(feats)

        x_tensor = torch.tensor(feature_list, dtype=torch.float32, device=self.device)

        # 2. Build Normalized Adjacency Matrix [num_nodes, num_nodes]
        norm_adj = compute_normalized_adj(num_nodes, edges, self.device)

        # 3. Model Forward Pass
        self.model.eval()
        with torch.no_grad():
            logits, graph_embed = self.model(x_tensor, norm_adj)
            probs = F.softmax(logits, dim=1).cpu().numpy()[0]

        benign_prob = float(round(float(probs[0]), 4))
        malware_prob = float(round(float(probs[1]), 4))

        is_malicious = malware_prob >= 0.5
        prediction = "MALICIOUS" if is_malicious else "BENIGN"
        confidence = float(round(max(benign_prob, malware_prob), 4))
        elapsed_ms = float(round((time.perf_counter() - start_time) * 1000, 2))

        # Node stats for diagnostics
        high_entropy_count = sum(1 for f in feature_list if len(f) > 1 and f[1] > 7.0)
        rwx_count = sum(1 for f in feature_list if len(f) > 3 and f[3] >= 6.0)

        return {
            "prediction": prediction,
            "malware_probability": malware_prob,
            "benign_probability": benign_prob,
            "confidence": confidence,
            "model_version": self.model_version,
            "feature_schema_version": self.feature_schema_version,
            "inference_time_ms": elapsed_ms,
            "metadata": {
                "num_nodes": num_nodes,
                "num_edges": len(edges),
                "high_entropy_sections": high_entropy_count,
                "rwx_sections": rwx_count,
                "device": str(self.device),
                "graph_embedding_dim": int(graph_embed.size(1))
            }
        }
