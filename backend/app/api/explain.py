"""
api/explain.py

GET /alerts/{alert_id}/explain - Generates a plain-English explanation of an alert using Gemini.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import gemini_service

router = APIRouter(tags=["Incident Explanation"])


class ExplainResponse(BaseModel):
    alert_id: int
    explanation: str


@router.get("/alerts/{alert_id}/explain", response_model=ExplainResponse)
def explain_alert_endpoint(alert_id: int, db: Session = Depends(get_db)):
    """
    Fetch an alert by ID and use Gemini to generate a factual, 
    plain-English explanation of what occurred.
    """
    try:
        explanation = gemini_service.explain_alert(alert_id, db)
        return ExplainResponse(
            alert_id=alert_id,
            explanation=explanation
        )
    except ValueError as e:
        # Alert not found or associated log not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        # Gemini API or internal error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while explaining the alert: {e}"
        )
