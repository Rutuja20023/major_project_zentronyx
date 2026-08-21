import logging
from typing import Dict, Any, List

logger = logging.getLogger("zentronyx.analyzers.graph_builder")


class BinaryGraphBuilder:
    """
    Constructs a deterministic Graph Representation (Structural Code Property Graph)
    from extracted static binary features.
    
    Graph Topology:
      Nodes:
        0: HEADER node (file metadata, total entropy)
        1..N: SECTION nodes (section entropy, size, permissions)
        N+1..M: IMPORT_LIB / FUNCTION nodes
        M+1..K: STRING_BLOCK nodes
      Edges:
        HEADER -> SECTION (CONTAINS)
        SECTION -> IMPORT_LIB (IMPORTS)
        SECTION -> STRING_BLOCK (REFERENCES)
    """

    @staticmethod
    def build_graph(features: Dict[str, Any]) -> Dict[str, Any]:
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        file_size = features.get("file_size", 0)
        overall_entropy = features.get("overall_entropy", 0.0)
        fmt = features.get("format", "ELF")
        sections = features.get("sections", [])
        imports = features.get("imports", [])
        string_stats = features.get("string_stats", {})

        # Node 0: HEADER
        nodes.append({
            "id": 0,
            "type": "HEADER",
            "features": [
                1.0 if fmt == "ELF" else 2.0,
                overall_entropy,
                float(file_size),
                5.0,
                0.0, 0.0, 0.0, 0.0
            ]
        })

        current_id = 1

        # Section Nodes
        section_node_ids = []
        for sec in sections:
            sec_id = current_id
            current_id += 1
            section_node_ids.append(sec_id)

            sec_entropy = sec.get("entropy", 0.0)
            sec_size = float(sec.get("size", 0))
            sec_perm = float(sec.get("permissions", 5))

            nodes.append({
                "id": sec_id,
                "type": "SECTION",
                "features": [
                    2.0,
                    sec_entropy,
                    sec_size,
                    sec_perm,
                    0.0, 0.0, 0.0, 0.0
                ]
            })

            # Edge HEADER -> SECTION
            edges.append({
                "source": 0,
                "target": sec_id,
                "relation": "CONTAINS"
            })

        # Import Nodes
        for imp in imports:
            imp_id = current_id
            current_id += 1

            nodes.append({
                "id": imp_id,
                "type": "IMPORT_LIB",
                "features": [
                    3.0,
                    1.0,
                    float(len(imp)),
                    5.0,
                    0.0, 0.0, 0.0, 0.0
                ]
            })

            # Link to text or first section
            target_sec = section_node_ids[0] if section_node_ids else 0
            edges.append({
                "source": target_sec,
                "target": imp_id,
                "relation": "IMPORTS"
            })

        # String Block Node
        str_id = current_id
        current_id += 1

        nodes.append({
            "id": str_id,
            "type": "STRING_BLOCK",
            "features": [
                4.0,
                2.5,
                float(string_stats.get("count", 0)),
                float(string_stats.get("max_len", 0)),
                0.0, 0.0, 0.0, 0.0
            ]
        })

        target_sec = section_node_ids[0] if section_node_ids else 0
        edges.append({
            "source": target_sec,
            "target": str_id,
            "relation": "REFERENCES"
        })

        return {
            "nodes": nodes,
            "edges": edges,
            "num_nodes": len(nodes),
            "binary_format": fmt,
            "architecture": features.get("architecture", "x86_64"),
            "file_size_bytes": file_size,
            "sha256": features.get("sha256")
        }
