import os
import hashlib
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO


class StorageService(ABC):
    @abstractmethod
    async def save_file(self, file_obj: BinaryIO, destination: Path) -> int:
        pass

    @abstractmethod
    def calculate_fingerprint(self, file_path: Path) -> str:
        pass

    @abstractmethod
    def delete_file(self, file_path: Path) -> bool:
        pass


class LocalStorageService(StorageService):
    async def save_file(self, file_obj: BinaryIO, destination: Path) -> int:
        destination.parent.mkdir(parents=True, exist_ok=True)
        total_size = 0
        chunk_size = 1024 * 1024  # 1MB chunks
        with open(destination, "wb") as f:
            while chunk := file_obj.read(chunk_size):
                f.write(chunk)
                total_size += len(chunk)
        return total_size

    def calculate_fingerprint(self, file_path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(1024 * 1024):
                sha256.update(chunk)
        return sha256.hexdigest()

    def calculate_string_fingerprint(self, content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def delete_file(self, file_path: Path) -> bool:
        if file_path.exists() and file_path.is_file():
            os.remove(file_path)
            return True
        return False
