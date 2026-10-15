from fastapi import APIRouter
from app.config import settings
from app.database import check_database_connectivity
from app.schemas.common import HealthCheckResponse, DatabaseStatus

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="System and Database Health Check",
    description="Returns the operational status of TenderGuard backend services and PostgreSQL database connectivity."
)
def get_health() -> HealthCheckResponse:
    db_status = check_database_connectivity()
    return HealthCheckResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        database=DatabaseStatus(**db_status)
    )
