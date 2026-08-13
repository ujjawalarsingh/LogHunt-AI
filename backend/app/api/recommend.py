"""
api/recommend.py

GET /alerts/{alert_id}/recommend - Generates actionable mitigation recommendations for an alert using Gemini.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import gemini_service

router = APIRouter(tags=["Incident Explanation"])


class RecommendResponse(BaseModel):
    alert_id: int
    recommendation: str


@router.get("/alerts/{alert_id}/recommend", response_model=RecommendResponse)
def recommend_alert_endpoint(alert_id: int, db: Session = Depends(get_db)):
    """
    Fetch an alert by ID and use Gemini to generate specific, actionable
    mitigation steps for the threat.
    """
    try:
        recommendation = gemini_service.recommend_mitigation(alert_id, db)
        return RecommendResponse(
            alert_id=alert_id,
            recommendation=recommendation
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
            detail=f"An error occurred while generating recommendations: {e}"
        )
