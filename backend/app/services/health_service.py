import time
from datetime import datetime, timezone
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import check_database_connection
from app.schemas.health import HealthResponse, ServiceHealth


class HealthService:
    @staticmethod
    async def get_system_health() -> HealthResponse:
        """Collects operational status and latencies across database and external microservices."""
        # 1. Check Database
        db_health_dict = await check_database_connection()
        db_status = ServiceHealth(
            status=db_health_dict.get("status", "unhealthy"),
            latency_ms=db_health_dict.get("latency_ms"),
            details=db_health_dict.get("details", db_health_dict.get("error"))
        )

        # 2. Check AI Service (non-blocking, graceful fallback)
        ai_status = await HealthService.check_ai_service_health()

        # Overall Status Determination
        overall = "healthy"
        if db_status.status != "healthy":
            overall = "unhealthy"
        elif ai_status.status != "healthy":
            overall = "degraded"

        return HealthResponse(
            status=overall,
            version=settings.VERSION,
            timestamp=datetime.now(timezone.utc).isoformat(),
            environment=settings.ENVIRONMENT,
            services={
                "database": db_status,
                "ai_service": ai_status
            }
        )

    @staticmethod
    async def check_ai_service_health() -> ServiceHealth:
        start = time.time()
        ai_url = f"{settings.AI_SERVICE_URL.rstrip('/')}/health"
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(ai_url)
                latency = round((time.time() - start) * 1000, 2)
                if res.status_code == 200:
                    return ServiceHealth(status="healthy", latency_ms=latency, details="AI microservice active")
                else:
                    return ServiceHealth(status="degraded", latency_ms=latency, details=f"HTTP {res.status_code}")
        except Exception as e:
            latency = round((time.time() - start) * 1000, 2)
            return ServiceHealth(
                status="unreachable",
                latency_ms=latency,
                details=f"AI service unavailable: {type(e).__name__}"
            )
