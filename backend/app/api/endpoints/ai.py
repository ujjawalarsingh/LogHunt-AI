from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

class QueryRequest(BaseModel):
    query: str

@router.post("/query")
async def generate_sql(req: QueryRequest) -> Dict[str, Any]:
    return ai_service.generate_sql(req.query)

@router.post("/summarize")
async def summarize_logs(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    return ai_service.summarize_logs(logs)
