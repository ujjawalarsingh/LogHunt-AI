from fastapi import APIRouter
from app.api.endpoints import analyze, ai

api_router = APIRouter()
api_router.include_router(analyze.router, tags=["analyze"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
