import os
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.settings import get_settings, update_settings, SettingsSchema

router = APIRouter()

class SettingsResponse(BaseModel):
    is_gemini_configured: bool
    config: SettingsSchema

@router.get("/settings", response_model=SettingsResponse)
def get_current_settings():
    is_configured = bool(os.getenv("GEMINI_API_KEY"))
    config = get_settings()
    return SettingsResponse(is_gemini_configured=is_configured, config=config)

@router.post("/settings", response_model=SettingsSchema)
def save_settings(new_settings: SettingsSchema):
    return update_settings(new_settings)
