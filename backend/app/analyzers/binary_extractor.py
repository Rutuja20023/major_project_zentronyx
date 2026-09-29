import os
import math
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("zentronyx.analyzers.binary_extractor")

MAX_BINARY_FILE_SIZE = 50 * 1024 * 1024  # 50MB limit for safe static inspection


class BinaryFeatureExtractor:
    """
    Static Binary Feature Extractor.
    Extracts structural features, section statistics, entropy, and symbol imports
    WITHOUT executing the binary target.
    """

    @staticmethod
    def is_eligible_binary(file_path: Path) -> Tuple[bool, str]:
        """Checks if file is a supported ELF or PE binary via magic byte inspection."""
        if not file_path.exists() or file_path.stat().st_size == 0:
            return False, "UNKNOWN"

        if file_path.stat().st_size > MAX_BINARY_FILE_SIZE:
            return False, "EXCEEDS_SIZE_LIMIT"

        try:
            with open(file_path, "rb") as f:
                header = f.read(16)

            if header.startswith(b"\x7fELF"):
                return True, "ELF"
            elif header.startswith(b"MZ"):
                return True, "PE"
            elif header.startswith(b"\xfe\xed\xfa\xce") or header.startswith(b"\xcf\xfa\xed\xfe") or header.startswith(b"\xca\xfe\xba\xbe"):
                return True, "MACHO"

            # Check binary extensions for samples with non-standard/packed headers
            binary_exts = {".exe", ".dll", ".bin", ".sys", ".scr", ".com", ".elf", ".so", ".dylib", ".out"}
            if file_path.suffix.lower() in binary_exts:
                if b"\x00" in header:
                    return True, "PE" if file_path.suffix.lower() in {".exe", ".dll", ".sys", ".scr", ".com"} else "ELF"
        except Exception as e:
            logger.error(f"Error reading magic bytes from {file_path}: {str(e)}")

        return False, "UNSUPPORTED"

    @staticmethod
    def calculate_entropy(data: bytes) -> float:
        """Calculates Shannon entropy of data byte array."""
        if not data:
            return 0.0
        entropy = 0.0
        length = len(data)
        freqs = {}
        for b in data:
            freqs[b] = freqs.get(b, 0) + 1
        for count in freqs.values():
            p = count / length
            entropy -= p * math.log2(p)
        return round(entropy, 4)

    @classmethod
    def extract_features(cls, file_path: Path) -> Dict[str, Any]:
        """Extracts complete static feature payload from eligible binary."""
        eligible, fmt = cls.is_eligible_binary(file_path)
        if not eligible:
            raise ValueError(f"File {file_path.name} is not an eligible binary ({fmt}).")

        file_bytes = file_path.read_bytes()
        file_size = len(file_bytes)
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()

        overall_entropy = cls.calculate_entropy(file_bytes)

        # Parse static sections
        sections = []
        if fmt == "ELF":
            sections = cls._extract_elf_sections(file_bytes)
        elif fmt == "PE":
            sections = cls._extract_pe_sections(file_bytes)

        if not sections:
            # Fallback section division for feature representation
            chunk_size = max(1024, file_size // 4)
            for i in range(0, file_size, chunk_size):
                chunk = file_bytes[i:i + chunk_size]
                sections.append({
                    "name": f".section_{i // chunk_size}",
                    "size": len(chunk),
                    "entropy": cls.calculate_entropy(chunk),
                    "permissions": 5 if i == 0 else 3  # R-X vs RW-
                })

        # String statistics
        strings = cls._extract_printable_strings(file_bytes)
        string_stats = {
            "count": len(strings),
            "max_len": max((len(s) for s in strings), default=0),
            "avg_len": round(sum(len(s) for s in strings) / max(len(strings), 1), 2)
        }

        # Imports inspection
        imports = cls._extract_suspicious_imports(strings)

        return {
            "file_name": file_path.name,
            "format": fmt,
            "file_size": file_size,
            "sha256": sha256_hash,
            "overall_entropy": overall_entropy,
            "architecture": "x86_64",
            "sections": sections,
            "string_stats": string_stats,
            "imports": imports,
            "sample_strings": strings[:10]
        }

    @staticmethod
    def _extract_elf_sections(file_bytes: bytes) -> List[Dict[str, Any]]:
        sections = []
        # Parse standard ELF section headers statically
        if len(file_bytes) > 64:
            e_shoff = int.from_bytes(file_bytes[40:48], "little") if len(file_bytes) >= 48 else 0
            e_shentsize = int.from_bytes(file_bytes[58:60], "little") if len(file_bytes) >= 60 else 64
            e_shnum = int.from_bytes(file_bytes[60:62], "little") if len(file_bytes) >= 62 else 0

            if e_shoff > 0 and e_shoff < len(file_bytes):
                for i in range(min(e_shnum, 16)):
                    off = e_shoff + (i * e_shentsize)
                    if off + 64 <= len(file_bytes):
                        sh_flags = int.from_bytes(file_bytes[off+8:off+16], "little")
                        sh_offset = int.from_bytes(file_bytes[off+24:off+32], "little")
                        sh_size = int.from_bytes(file_bytes[off+32:off+40], "little")

                        section_data = file_bytes[sh_offset:sh_offset + min(sh_size, 65536)] if sh_offset < len(file_bytes) else b""
                        sections.append({
                            "name": f".section_{i}",
                            "size": sh_size,
                            "entropy": BinaryFeatureExtractor.calculate_entropy(section_data),
                            "permissions": sh_flags & 0x7
                        })
        return sections

    @staticmethod
    def _extract_pe_sections(file_bytes: bytes) -> List[Dict[str, Any]]:
        sections = []
        if len(file_bytes) > 0x3c + 4:
            pe_offset = int.from_bytes(file_bytes[0x3c:0x40], "little")
            if pe_offset < len(file_bytes) - 250:
                num_sections = int.from_bytes(file_bytes[pe_offset+6:pe_offset+8], "little")
                opt_header_size = int.from_bytes(file_bytes[pe_offset+20:pe_offset+22], "little")

                sec_table_offset = pe_offset + 24 + opt_header_size
                for i in range(min(num_sections, 16)):
                    sec_off = sec_table_offset + (i * 40)
                    if sec_off + 40 <= len(file_bytes):
                        name = file_bytes[sec_off:sec_off+8].decode("latin1", errors="ignore").rstrip("\x00")
                        vsize = int.from_bytes(file_bytes[sec_off+8:sec_off+12], "little")
                        raw_off = int.from_bytes(file_bytes[sec_off+20:sec_off+24], "little")
                        raw_size = int.from_bytes(file_bytes[sec_off+16:sec_off+20], "little")
                        characteristics = int.from_bytes(file_bytes[sec_off+36:sec_off+40], "little")

                        is_exec = bool(characteristics & 0x20000000)
                        is_read = bool(characteristics & 0x40000000)
                        is_write = bool(characteristics & 0x80000000)
                        perm = (4 if is_read else 0) | (2 if is_write else 0) | (1 if is_exec else 0)

                        sec_data = file_bytes[raw_off:raw_off + min(raw_size, 65536)] if raw_off < len(file_bytes) else b""
                        sections.append({
                            "name": name or f".sec_{i}",
                            "size": raw_size,
                            "entropy": BinaryFeatureExtractor.calculate_entropy(sec_data),
                            "permissions": perm if perm > 0 else (7 if is_exec else 5)
                        })
        return sections

    @staticmethod
    def _extract_printable_strings(file_bytes: bytes, min_length: int = 4) -> List[str]:
        strings = []
        current = []
        for b in file_bytes:
            if 32 <= b <= 126:
                current.append(chr(b))
            else:
                if len(current) >= min_length:
                    strings.append("".join(current))
                current = []
        if len(current) >= min_length:
            strings.append("".join(current))
        return strings[:200]

    @staticmethod
    def _extract_suspicious_imports(strings: List[str]) -> List[str]:
        suspicious_list = ["ptrace", "system", "execve", "winexec", "createprocess", "virtualalloc", "writeprocessmemory"]
        matches = []
        for s in strings:
            low = s.lower()
            for susp in suspicious_list:
                if susp in low:
                    matches.append(s)
                    break
        return matches[:20]
