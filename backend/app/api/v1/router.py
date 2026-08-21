from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, users, projects, sources, analysis, scans, webhooks, audit, policies, reports

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(sources.router)
api_router.include_router(analysis.router)
api_router.include_router(scans.router)
api_router.include_router(webhooks.router)
api_router.include_router(audit.router)
api_router.include_router(policies.router)
api_router.include_router(reports.router)



