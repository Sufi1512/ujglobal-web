from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "local"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ujglobal"
    cors_origins: list[str] = ["http://localhost:3000"]
    ip_hash_salt: str = "change-me"


@lru_cache
def get_settings() -> Settings:
    return Settings()
