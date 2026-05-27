from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cafirm:cafirm123@localhost:5432/cafirm_db"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_timeout: int = 120
    ollama_max_tokens: int = 2048
    secret_key: str = "change-this-to-a-random-string-in-production"
    environment: str = "development"
    file_storage_path: str = "./uploads"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
