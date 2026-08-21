"""
Zentronyx GNN Malware Training - Dataset Builder Pipeline
"""

import os
import json
import random
from typing import List, Dict, Any, Tuple


class MalwareDatasetBuilder:
    """
    Constructs, balances, and pre-processes binary graph representations for GNN model training.
    """

    def __init__(self, train_ratio: float = 0.8, val_ratio: float = 0.1, test_ratio: float = 0.1):
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio

    def generate_synthetic_benchmark(self, num_samples: int = 200) -> List[Dict[str, Any]]:
        """
        Generates benchmark dataset of ELF & PE graph samples for model training & validation.
        """
        dataset = []
        random.seed(42)

        for i in range(num_samples):
            is_malware = i % 2 == 1
            num_nodes = random.randint(8, 30)

            nodes = []
            # Header node
            nodes.append({"id": 0, "type": "HEADER", "features": [1.0, 4.5, 512, 5, 0, 0, 0, 0]})

            # Section nodes
            for s in range(1, min(6, num_nodes)):
                entropy = random.uniform(6.8, 7.9) if is_malware else random.uniform(2.5, 5.5)
                perm = 7.0 if (is_malware and s == 2) else 5.0  # RWX for malware
                nodes.append({
                    "id": s,
                    "type": "SECTION",
                    "features": [2.0, round(entropy, 2), 4096 * s, perm, 0, 0, 0, 0]
                })

            # Function / Import nodes
            for fn in range(len(nodes), num_nodes):
                name = "ptrace_inject" if (is_malware and fn == len(nodes)) else f"fn_{fn}"
                nodes.append({
                    "id": fn,
                    "type": "FUNCTION" if fn % 2 == 0 else "IMPORT_LIB",
                    "features": [3.0, 1.0, 128, 5.0, 0, 0, 0, 0]
                })

            edges = []
            for n in range(1, len(nodes)):
                edges.append({"source": 0, "target": n, "relation": "CONTAINS"})
                if n > 2:
                    edges.append({"source": 1, "target": n, "relation": "REFERENCES"})

            label = 1 if is_malware else 0
            dataset.append({
                "sample_id": f"sample_{i:04d}",
                "label": label,
                "label_name": "MALICIOUS" if is_malware else "BENIGN",
                "graph": {
                    "nodes": nodes,
                    "edges": edges,
                    "num_nodes": len(nodes)
                }
            })

        return dataset

    def split_dataset(self, dataset: List[Dict[str, Any]]) -> Tuple[List[Any], List[Any], List[Any]]:
        random.shuffle(dataset)
        total = len(dataset)
        train_end = int(total * self.train_ratio)
        val_end = train_end + int(total * self.val_ratio)

        train_set = dataset[:train_end]
        val_set = dataset[train_end:val_end]
        test_set = dataset[val_end:]

        return train_set, val_set, test_set


if __name__ == "__main__":
    builder = MalwareDatasetBuilder()
    ds = builder.generate_synthetic_benchmark(100)
    train, val, test = builder.split_dataset(ds)
    print(f"Generated Benchmark Dataset: Total={len(ds)}, Train={len(train)}, Val={len(val)}, Test={len(test)}")
