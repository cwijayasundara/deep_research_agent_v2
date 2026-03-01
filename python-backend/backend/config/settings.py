"""Application settings loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings


def _find_env_file() -> str | None:
    """Walk up from this file's directory to find the nearest .env file."""
    current = Path(__file__).resolve().parent
    for _ in range(5):  # at most 5 levels up
        candidate = current / ".env"
        if candidate.is_file():
            return str(candidate)
        current = current.parent
    return None


_ENV_FILE = _find_env_file()


class Settings(BaseSettings):
    app_env: str = "development"
    app_port: int = 8001

    openai_api_key: str
    gemini_api_key: str = ""
    tavily_api_key: str

    app_shared_password: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    openai_model: str = "gpt-5-mini"
    python_model: str = "google_genai:gemini-3-flash-preview"

    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": _ENV_FILE or (), "extra": "ignore"}
