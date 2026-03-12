from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Embeddings: LOCAL by default (no API key, no quota, already installed) ─
    # Changing this to "gemini" or "openai" requires an API key in .env
    embedding_provider: str = "local"
    local_embedding_model: str = "all-MiniLM-L6-v2"  # 384 dims, ~90 MB

    # ── LLM: Groq (free, no credit card) ─────────────────────────────────────
    # Get free key at: https://console.groq.com  (takes 30 seconds)
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"   # free, fast

    # ── LLM: Gemini (free alternative) ───────────────────────────────────────
    gemini_api_key: str = ""
    gemini_llm_model: str = "gemini-1.5-flash"
    gemini_embedding_model: str = "text-embedding-004"

    # ── LLM: OpenAI (paid) ────────────────────────────────────────────────────
    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    # ── Provider selection ────────────────────────────────────────────────────
    # llm_provider: "auto" | "groq" | "gemini" | "openai"
    # auto → Groq if key set, else Gemini if key set, else OpenAI if key set, else fallback
    llm_provider: str = "auto"

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    ingestion_queue: str = "ingestion_queue"
    ingestion_status_channel: str = "ingestion_status"

    # ── Storage ───────────────────────────────────────────────────────────────
    vector_db_path: str = "/data/chromadb"
    upload_path: str = "/data/uploads"

    # ── URLs ──────────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    # ── RAG tuning ────────────────────────────────────────────────────────────
    chunk_size: int = 512
    chunk_overlap: int = 64
    top_k_results: int = 5
    max_file_size_mb: int = 20

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
