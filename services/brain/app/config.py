from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ai-service"
    host: str = "0.0.0.0"
    port: int = 8000

    # Add provider API keys / model config here, e.g.:
    # anthropic_api_key: str | None = None
    # openai_api_key: str | None = None


settings = Settings()
