from fastapi import APIRouter, status
from app.schemas.health import HealthResponse
from app.services.health_service import HealthService

router = APIRouter(prefix="/health", tags=["Health & Monitoring"])


@router.get(
    "",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Get overall system operational status",
    description="Returns detailed health metrics for backend services, database connectivity, and external dependencies."
)
async def get_health():
    """Performs deep health check across database and microservices."""
    return await HealthService.get_system_health()
