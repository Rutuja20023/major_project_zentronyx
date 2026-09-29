# Zentronyx Deep GNN Binary Malware Dataset & Model Specification

## 1. Dataset Overview
- **Dataset Title**: `Zentronyx-BinaryMalware-Benchmark-v2`
- **Primary Objective**: Deep Graph Neural Network (GNN) classification of ELF and PE executable binary Code Property Graphs into `BENIGN` or `MALICIOUS`.
- **License**: Apache 2.0 / Open Defense Research License.
- **Class Balance**: 50% Benign executables (clean system utilities, open-source packages), 50% Malicious executables (packed binaries, code injection vectors, suspicious API imports).

## 2. Sample Distribution & Stratification
- **Benchmark Dataset Samples**: 500 Code Property Graph Artifacts
- **Train Split (80%)**: 400 Samples
- **Validation Split (10%)**: 50 Samples
- **Test Split (10%)**: 50 Samples

## 3. Graph Representation & Feature Schema
- **Nodes**: Structural binary entities (`HEADER`, `SECTION`, `FUNCTION`, `IMPORT_LIB`, `STRING_BLOCK`).
- **Node Feature Dimensions ($F=8$)**:
  1. Node Type Identifier (`1.0`=ELF, `2.0`=PE/Section, `3.0`=Function, `4.0`=Import, `5.0`=String Table)
  2. Shannon Entropy ($0.0 - 8.0$)
  3. Size in Bytes / Instruction Size
  4. Memory Permission Flags (`3.0`=RW-, `5.0`=R-X, `7.0`=RWX executable+writable injection)
  5. Suspicious API Indicator ($0.0$ or $1.0$)
  6. Topological Degree / Centrality
  7. Section Alignment / Complexity
  8. Reserved / Future Feature Dimension
- **Edges**: Symmetrically normalized directed & reference graph relations (`CONTAINS`, `DEFINES`, `CALLS`, `IMPORTS`, `REFERENCES`).
- **Graph Normalization**: Symmetrically normalized Laplacian $\mathbf{\hat{A}} = \mathbf{\tilde{D}}^{-1/2} (\mathbf{A} + \mathbf{I}) \mathbf{\tilde{D}}^{-1/2}$.

## 4. Deep GNN Model Architecture
- **Layer 1**: Graph Convolution (`in_features=8`, `hidden_dim=64`) + BatchNorm1d + LeakyReLU(0.1) + Dropout(0.2)
- **Layer 2**: Graph Convolution (`hidden_dim=64`, `hidden_dim=64`) + BatchNorm1d + LeakyReLU(0.1) + Dropout(0.2)
- **Layer 3**: Graph Convolution (`hidden_dim=64`, `hidden_dim=64`) + BatchNorm1d + LeakyReLU(0.1)
- **Global Readout**: Concatenated $\left[\text{MeanPool}(\mathbf{H}) \,\|\, \text{MaxPool}(\mathbf{H})\right] \in \mathbb{R}^{128}$
- **Classification Head (MLP)**: $\text{Linear}(128 \to 64) \to \text{LeakyReLU} \to \text{Dropout}(0.2) \to \text{Linear}(64 \to 2)$
- **Optimization**: AdamW ($\text{lr}=0.003, \text{weight\_decay}=10^{-4}$) with CosineAnnealingLR scheduler.

## 5. Model Limitations & Deployment Notes
- **Supported Formats**: Linux ELF (32/64-bit), Windows PE (.exe, .dll).
- **Weight Checkpoint**: Saved as `app/models/gnn_malware_weights.pt` for direct loading by FastAPI AI service.
