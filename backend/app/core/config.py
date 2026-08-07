import logging
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LogHunt AI"
    API_V1_STR: str = "/api"
    # PostgreSQL connection URL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost/loghunt"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
