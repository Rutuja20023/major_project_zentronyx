"""
Zentronyx GNN Malware Training - Dataset Builder & Feature Extractor Pipeline
Supports BODMAS / PE / ELF feature distributions and graph benchmarks.
"""

import os
import json
import random
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("zentronyx.training.dataset_builder")


class MalwareDatasetBuilder:
    """
    Constructs, balances, and pre-processes binary graph representations for GNN model training.
    """

    BENIGN_IMPORTS = [
        "printf", "malloc", "free", "exit", "strlen", "strcpy", "memcpy",
        "fopen", "fread", "fwrite", "fclose", "socket", "connect", "bind",
        "listen", "accept", "gethostbyname", "time", "clock", "getenv"
    ]

    MALICIOUS_IMPORTS = [
        "ptrace", "winexec", "createprocessa", "createprocessw", "virtualalloc",
        "virtualallocex", "writeprocessmemory", "readprocessmemory", "createremotethread",
        "shellexecutea", "urldownloadtofilea", "regsetvalueexa", "setwindowshookexa",
        "internetopenurla", "ntunmapviewofsection", "isdebuggerpresent", "adjusttokenprivileges"
    ]

    def __init__(self, train_ratio: float = 0.8, val_ratio: float = 0.1, test_ratio: float = 0.1, random_seed: int = 42):
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.random_seed = random_seed
        random.seed(random_seed)

    def load_from_jsonl(self, file_path: str) -> List[Dict[str, Any]]:
        """Loads graph dataset from a .jsonl file."""
        dataset = []
        p = Path(file_path)
        if not p.exists():
            raise FileNotFoundError(f"Dataset file not found: {file_path}")

        with open(p, "r", encoding="utf-8") as f:
            for line_idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    dataset.append(data)
                except Exception as e:
                    logger.warning(f"Error parsing line {line_idx} in {file_path}: {e}")
        logger.info(f"Loaded {len(dataset)} graph samples from {file_path}")
        return dataset

    def export_to_jsonl(self, dataset: List[Dict[str, Any]], output_path: str) -> None:
        """Exports graph dataset to a .jsonl file."""
        p = Path(output_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            for sample in dataset:
                f.write(json.dumps(sample) + "\n")
        logger.info(f"Saved {len(dataset)} samples to {output_path}")

    def generate_benchmark_dataset(self, num_samples: int = 500) -> List[Dict[str, Any]]:
        """
        Generates realistic binary graph samples modeled after BODMAS and PE/ELF distributions.
        Includes balanced 50% Benign and 50% Malicious executables.
        """
        dataset = []
        random.seed(self.random_seed)

        num_benign = num_samples // 2
        num_malware = num_samples - num_benign

        # 1. Generate Benign Executable Graphs
        for i in range(num_benign):
            sample = self._generate_single_sample(sample_id=f"benign_{i:05d}", is_malware=False)
            dataset.append(sample)

        # 2. Generate Malware Executable Graphs
        for i in range(num_malware):
            sample = self._generate_single_sample(sample_id=f"malware_{i:05d}", is_malware=True)
            dataset.append(sample)

        random.shuffle(dataset)
        return dataset

    def _generate_single_sample(self, sample_id: str, is_malware: bool) -> Dict[str, Any]:
        """Generates a realistic single binary Code Property Graph sample."""
        fmt = "ELF" if random.random() > 0.5 else "PE"
        num_sections = random.randint(3, 7)
        num_functions = random.randint(6, 20)
        num_imports = random.randint(4, 12)

        nodes = []
        edges = []

        # Node 0: HEADER
        header_entropy = random.uniform(3.5, 5.8) if not is_malware else random.uniform(5.5, 7.8)
        total_size = random.randint(10240, 5242880) # 10KB to 5MB
        nodes.append({
            "id": 0,
            "type": "HEADER",
            "name": f"{fmt}_HEADER",
            "features": [
                1.0 if fmt == "ELF" else 2.0,
                round(header_entropy, 2),
                float(min(total_size // 1024, 10000)), # size in KB
                5.0, # standard perm
                0.0, 0.0, 0.0, 0.0
            ]
        })

        curr_id = 1
        section_ids = []

        # Section Nodes
        for s in range(num_sections):
            sec_id = curr_id
            curr_id += 1
            section_ids.append(sec_id)

            if is_malware:
                # Malware has packed/encrypted high entropy sections and occasionally RWX (perm=7)
                sec_entropy = random.uniform(6.9, 7.99) if s == 1 or s == 2 else random.uniform(3.5, 6.2)
                perm = 7.0 if (s == 1 and random.random() > 0.3) else 5.0 # RWX code injection
            else:
                # Benign has standard code (entropy 4.0-6.0) and read/write data (entropy 2.0-4.5)
                sec_entropy = random.uniform(2.5, 5.8)
                perm = 5.0 if s == 0 else 3.0 # R-X (text) or RW- (data)

            sec_size = random.randint(512, 65536)
            nodes.append({
                "id": sec_id,
                "type": "SECTION",
                "name": f".section_{s}",
                "features": [
                    2.0,
                    round(sec_entropy, 2),
                    float(sec_size),
                    perm,
                    0.0, 0.0, 0.0, 0.0
                ]
            })

            # Edge: HEADER -> SECTION
            edges.append({"source": 0, "target": sec_id, "relation": "CONTAINS"})

        # Function Nodes
        func_ids = []
        for fn in range(num_functions):
            fn_id = curr_id
            curr_id += 1
            func_ids.append(fn_id)

            fn_size = random.randint(32, 2048)
            fn_entropy = random.uniform(3.0, 6.5) if not is_malware else random.uniform(4.5, 7.5)
            nodes.append({
                "id": fn_id,
                "type": "FUNCTION",
                "name": f"sub_{fn:04x}",
                "features": [
                    3.0,
                    round(fn_entropy, 2),
                    float(fn_size),
                    5.0,
                    0.0, 0.0, 0.0, 0.0
                ]
            })

            # Link function to a section
            parent_sec = section_ids[0] if section_ids else 0
            edges.append({"source": parent_sec, "target": fn_id, "relation": "DEFINES"})

        # Call edges between functions
        for _ in range(len(func_ids) * 2):
            src_fn = random.choice(func_ids)
            dst_fn = random.choice(func_ids)
            if src_fn != dst_fn:
                edges.append({"source": src_fn, "target": dst_fn, "relation": "CALLS"})

        # Import Nodes
        import_pool = self.MALICIOUS_IMPORTS if is_malware else self.BENIGN_IMPORTS
        chosen_imports = random.sample(import_pool, min(num_imports, len(import_pool)))
        for imp in chosen_imports:
            imp_id = curr_id
            curr_id += 1

            is_susp = 1.0 if imp in self.MALICIOUS_IMPORTS else 0.0
            nodes.append({
                "id": imp_id,
                "type": "IMPORT_LIB",
                "name": imp,
                "features": [
                    4.0,
                    1.0,
                    float(len(imp)),
                    is_susp * 5.0,
                    is_susp,
                    0.0, 0.0, 0.0
                ]
            })

            # Link random function to import
            caller_fn = random.choice(func_ids) if func_ids else 0
            edges.append({"source": caller_fn, "target": imp_id, "relation": "IMPORTS"})

        # String Block Node
        str_id = curr_id
        curr_id += 1
        num_strings = random.randint(10, 80)
        nodes.append({
            "id": str_id,
            "type": "STRING_BLOCK",
            "name": "strings_table",
            "features": [
                5.0,
                round(random.uniform(2.0, 4.0), 2),
                float(num_strings),
                float(random.randint(10, 120)), # max string len
                0.0, 0.0, 0.0, 0.0
            ]
        })
        edges.append({"source": section_ids[0] if section_ids else 0, "target": str_id, "relation": "REFERENCES"})

        label = 1 if is_malware else 0
        return {
            "sample_id": sample_id,
            "label": label,
            "label_name": "MALICIOUS" if is_malware else "BENIGN",
            "graph": {
                "nodes": nodes,
                "edges": edges,
                "num_nodes": len(nodes),
                "binary_format": fmt,
                "architecture": "x86_64",
                "file_size_bytes": total_size
            }
        }

    def split_dataset(
        self, dataset: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Splits dataset into stratified Train, Validation, and Test partitions."""
        benign_samples = [s for s in dataset if s["label"] == 0]
        malware_samples = [s for s in dataset if s["label"] == 1]

        random.shuffle(benign_samples)
        random.shuffle(malware_samples)

        def split_list(items):
            total = len(items)
            tr_end = int(total * self.train_ratio)
            va_end = tr_end + int(total * self.val_ratio)
            return items[:tr_end], items[tr_end:va_end], items[va_end:]

        b_tr, b_va, b_te = split_list(benign_samples)
        m_tr, m_va, m_te = split_list(malware_samples)

        train_set = b_tr + m_tr
        val_set = b_va + m_va
        test_set = b_te + m_te

        random.shuffle(train_set)
        random.shuffle(val_set)
        random.shuffle(test_set)

        return train_set, val_set, test_set


if __name__ == "__main__":
    builder = MalwareDatasetBuilder()
    ds = builder.generate_benchmark_dataset(300)
    train, val, test = builder.split_dataset(ds)
    print(f"Generated Benchmark: Total={len(ds)}, Train={len(train)}, Val={len(val)}, Test={len(test)}")
