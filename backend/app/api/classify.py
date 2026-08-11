"""
api/classify.py

POST /classify  — run the LoRA threat classifier on a stored log entry.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.repositories.log_repository import get_log_by_id
from app.ml import classifier_service

router = APIRouter(tags=["Classifier"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class ClassifyRequest(BaseModel):
    log_id: int


class ClassifyResponse(BaseModel):
    log_id: int
    label: str              # "Uncertain" when confidence < CONFIDENCE_THRESHOLD
    confidence: float
    raw_prediction: str     # model's top class regardless of threshold
    raw_confidence: float   # model's top probability regardless of threshold
    all_scores: dict[str, float]
    input_text: str
    note: Optional[str] = None      # set when label == "Uncertain"
    warning: Optional[str] = None   # set for known unreliable classes (SQL Injection)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/classify", response_model=ClassifyResponse)
def classify_log(request: ClassifyRequest, db: Session = Depends(get_db)):
    """
    Classify a stored log entry using the LoRA-fine-tuned threat classifier.

    Returns the predicted threat category and confidence score.
    Note: SQL Injection predictions are unreliable (F1=0.00 at evaluation —
    only 21 training examples). A warning is included in the response when
    this class is predicted.
    """
    log_row = get_log_by_id(db, request.log_id)
    if log_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log with id={request.log_id} not found."
        )

    try:
        result = classifier_service.classify_log_row(log_row)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classifier error: {str(e)}"
        )

    note = None
    if result["label"] == "Uncertain":
        note = (
            "Model confidence below threshold "
            f"({classifier_service.CONFIDENCE_THRESHOLD:.0%}) "
            "— input may differ from training data distribution."
        )

    warning = None
    if result["raw_prediction"] == "SQL Injection":
        warning = (
            "SQL Injection class has F1=0.00 at evaluation due to only 21 training "
            "examples. This prediction is unreliable — treat as informational only."
        )

    return ClassifyResponse(
        log_id=result["log_id"],
        label=result["label"],
        confidence=result["confidence"],
        raw_prediction=result["raw_prediction"],
        raw_confidence=result["raw_confidence"],
        all_scores=result["all_scores"],
        input_text=result["input_text"],
        note=note,
        warning=warning,
    )
