from fastapi import APIRouter
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.tenders import router as tenders_router
from app.routes.companies import router as companies_router
from app.routes.participations import router as participations_router
from app.routes.patterns import router as patterns_router
from app.routes.risk_analysis import router as risk_analysis_router
from app.routes.reports import router as reports_router

api_v1_router = APIRouter()

# Register sub-routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(tenders_router)
api_v1_router.include_router(companies_router)
api_v1_router.include_router(participations_router)
api_v1_router.include_router(patterns_router)
api_v1_router.include_router(risk_analysis_router)
api_v1_router.include_router(reports_router)
