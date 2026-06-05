from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./marketing_os.db"
    DATABASE_POOL_SIZE: int = 20
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # AI
    LITELLM_API_KEY: str = ""
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY")
    DEFAULT_MODEL: str = "gpt-4-turbo"
    MAX_TOKENS_PER_REQUEST: int = 4096
    
    # Services
    CGH_URL: str = "http://localhost:8009"
    MEMORY_SERVICE_URL: str = "http://localhost:8005"
    APPROVAL_SERVICE_URL: str = "http://localhost:8006"
    
    # Vault (Optional for local dev)
    VAULT_URL: str = "http://localhost:8200"
    VAULT_TOKEN: str = ""
    
    # Kafka
    KAFKA_BROKERS: str = "localhost:9092"
    
    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60
    INTERNAL_SERVICE_TOKEN: str = "fastoclick-super-secret-internal-token"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 1025))
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "False").lower() in ['true', '1', 'yes']
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "[EMAIL_ADDRESS]")

    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")
@lru_cache()
def get_settings() -> Settings:
    return Settings()