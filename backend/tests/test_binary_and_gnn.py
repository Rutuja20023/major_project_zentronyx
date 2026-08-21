import pytest
import struct
from pathlib import Path
from app.analyzers.binary_extractor import BinaryFeatureExtractor
from app.analyzers.graph_builder import BinaryGraphBuilder
from app.scanners.binary_analysis import BinaryAnalysisModule
from app.scanners.gnn_malware import GNNMalwareModule
from app.models.scan import FindingSeverity


def create_mock_elf_binary(path: Path):
    """Creates a minimal mock ELF binary file for static inspection testing."""
    header = b"\x7fELF\x02\x01\x01\x00" + (b"\x00" * 8)
    padding = b"\x00" * 128
    text_section = b"ptrace_inject_shellcode_payload_system"
    path.write_bytes(header + padding + text_section)


def create_mock_pe_binary(path: Path):
    """Creates a minimal mock PE binary file for static inspection testing."""
    header = b"MZ" + (b"\x00" * 0x3a) + struct.pack("<I", 0x40)
    pe_sig = b"PE\x00\x00"
    padding = b"\x00" * 128
    path.write_bytes(header + pe_sig + padding)


@pytest.mark.asyncio
async def test_binary_feature_extractor(tmp_path: Path):
    elf_path = tmp_path / "test_sample.elf"
    create_mock_elf_binary(elf_path)

    eligible, fmt = BinaryFeatureExtractor.is_eligible_binary(elf_path)
    assert eligible is True
    assert fmt == "ELF"

    features = BinaryFeatureExtractor.extract_features(elf_path)
    assert features["file_name"] == "test_sample.elf"
    assert features["format"] == "ELF"
    assert features["overall_entropy"] > 0
    assert len(features["sections"]) > 0


@pytest.mark.asyncio
async def test_binary_graph_builder(tmp_path: Path):
    elf_path = tmp_path / "sample.elf"
    create_mock_elf_binary(elf_path)

    features = BinaryFeatureExtractor.extract_features(elf_path)
    graph = BinaryGraphBuilder.build_graph(features)

    assert graph["num_nodes"] >= 3
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0
    assert graph["nodes"][0]["type"] == "HEADER"


@pytest.mark.asyncio
async def test_binary_analysis_module(tmp_path: Path):
    elf_path = tmp_path / "mock_bin"
    create_mock_elf_binary(elf_path)

    module = BinaryAnalysisModule()
    context = {"source_path": str(tmp_path), "binary_capable": True}

    assert await module.validate(context) is True
    findings = await module.execute(context)
    assert len(findings) > 0
    assert findings[0].scanner == "Binary Hardening Engine"


@pytest.mark.asyncio
async def test_gnn_malware_module_execution(tmp_path: Path):
    elf_path = tmp_path / "sample.elf"
    create_mock_elf_binary(elf_path)

    module = GNNMalwareModule()
    context = {"source_path": str(tmp_path)}

    assert await module.validate(context) is True
    findings = await module.execute(context)
    assert len(findings) > 0
    assert "GNN" in findings[0].scanner or "GNN" in findings[0].category
    assert findings[0].raw_metadata["model_version"] == "1.0.0-gnn-gcn"
