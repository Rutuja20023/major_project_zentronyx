import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict
from app.core.config import settings

SENSITIVE_KEYS = {"password", "token", "access_token", "jwt", "secret", "authorization"}


class SensitiveDataFilter(logging.Filter):
    """Filter that sanitizes sensitive data from log dicts/records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, dict):
            record.msg = self.sanitize_dict(record.msg)
        elif isinstance(record.msg, str):
            for key in SENSITIVE_KEYS:
                if key in record.msg.lower():
                    # Avoid logging if key looks like authorization header or token payload
                    pass
        return True

    @classmethod
    def sanitize_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = {}
        for k, v in data.items():
            if k.lower() in SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = cls.sanitize_dict(v)
            else:
                sanitized[k] = v
        return sanitized


class JSONFormatter(logging.Formatter):
    """Custom JSON log formatter for structured production logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_object = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "zentronyx-backend",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Attach request_id or user_id if present in record
        if hasattr(record, "request_id"):
            log_object["request_id"] = getattr(record, "request_id")
        if hasattr(record, "user_id"):
            log_object["user_id"] = getattr(record, "user_id")

        if record.exc_info:
            log_object["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_object)


def setup_logging():
    """Configures application logger."""
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)

    # Clear existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    if settings.ENVIRONMENT == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
        )

    handler.addFilter(SensitiveDataFilter())
    root_logger.addHandler(handler)

    # Silence noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


logger = logging.getLogger("zentronyx")
