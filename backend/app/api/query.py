"""
api/query.py

POST /query - Natural Language to SQL interface.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.services import gemini_service
from app.services.gemini_service import GeminiServiceError

router = APIRouter(tags=["Query Lab"])


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    sql: str
    results: list[dict[str, Any]]


@router.post("/query", response_model=QueryResponse)
def query_nl2sql(request: QueryRequest, db: Session = Depends(get_db)):
    """
    Convert a natural language question to a SQL query using Gemini,
    execute it securely (read-only), and return the SQL and results.
    """
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    try:
        data = gemini_service.natural_language_to_sql(request.question, db)
    except ValueError as e:
        # Validation or execution errors return 400
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except GeminiServiceError as e:
        # Propagate the proper HTTP status code from the Gemini service
        raise HTTPException(
            status_code=e.status_code,
            detail=str(e)
        )
    except Exception as e:
        # Unexpected errors return 500
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred while processing the query."
        )

    return QueryResponse(
        sql=data["sql"],
        results=data["results"]
    )
