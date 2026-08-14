import json
import os
from pydantic import BaseModel

SETTINGS_FILE = "settings.json"

class SettingsSchema(BaseModel):
    brute_force_threshold: int = 5
    brute_force_window_minutes: int = 5
    credential_stuffing_threshold: int = 3
    credential_stuffing_window_minutes: int = 10

def get_settings() -> SettingsSchema:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
            return SettingsSchema(**data)
        except Exception:
            pass
    return SettingsSchema()

def update_settings(new_settings: SettingsSchema) -> SettingsSchema:
    with open(SETTINGS_FILE, "w") as f:
        json.dump(new_settings.dict(), f, indent=4)
    return new_settings
