from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Project metadata
    PROJECT_NAME: str = "Zentronyx Security Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://zentronyx_user:zentronyx_secure_password_change_in_prod@localhost:5432/zentronyx_db"
    SYNC_DATABASE_URL: str = "postgresql://zentronyx_user:zentronyx_secure_password_change_in_prod@localhost:5432/zentronyx_db"

    # JWT Authentication
    JWT_SECRET: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Platform Engine Settings
    MAX_UPLOAD_SIZE: int = 104857600  # 100MB
    WORKSPACE_ROOT: str = "/tmp/zentronyx_workspaces"
    SCAN_TIMEOUT: int = 300

    # Scanner Tool Configurations
    SEMGREP_BIN: str = "semgrep"
    OSV_SCANNER_BIN: str = "osv-scanner"
    ZAP_BIN: str = "zap-cli"
    SEMGREP_TIMEOUT: int = 120
    OSV_SCANNER_TIMEOUT: int = 60
    ZAP_TIMEOUT: int = 180


    # Microservice URL
    AI_SERVICE_URL: str = "http://localhost:8001"

    # Security & CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)


settings = Settings()
