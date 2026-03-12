from __future__ import annotations

"""
Embedding service.

Default: LOCAL (sentence-transformers, no API key, no quota, works offline).
Override via EMBEDDING_PROVIDER env var: local | gemini | openai
"""

import asyncio
import logging
import os

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_local_model = None
_openai_client = None
_gemini_ready = False


def _provider() -> str:
    return settings.embedding_provider.lower()


def get_provider_name() -> str:
    p = _provider()
    if p == "gemini":
        return f"gemini ({settings.gemini_embedding_model})"
    if p == "openai":
        return f"openai ({settings.embedding_model})"
    return f"local ({settings.local_embedding_model})"


def get_embedding_dimension() -> int:
    p = _provider()
    if p == "gemini":
        return 768
    if p == "openai":
        return 1536
    return 384  # local all-MiniLM-L6-v2


# ── Public API ────────────────────────────────────────────────────────────────

async def embed_texts(texts: list, task_type: str = "retrieval_document") -> list:
    if not texts:
        return []
    p = _provider()
    logger.info(f"Embedding {len(texts)} chunk(s) via '{p}'")
    if p == "gemini":
        return await _embed_gemini(texts, task_type)
    if p == "openai":
        return await _embed_openai(texts)
    return await _embed_local(texts)


async def embed_query(text: str) -> list:
    p = _provider()
    if p == "gemini":
        return (await _embed_gemini([text], "retrieval_query"))[0]
    if p == "openai":
        return (await _embed_openai([text]))[0]
    return (await _embed_local([text]))[0]


# ── Local (DEFAULT) ───────────────────────────────────────────────────────────

def _get_local_model():
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer
        cache = os.environ.get("SENTENCE_TRANSFORMERS_HOME", "/data/model_cache")
        os.makedirs(cache, exist_ok=True)
        logger.info(f"Loading local model '{settings.local_embedding_model}'…")
        _local_model = SentenceTransformer(
            settings.local_embedding_model,
            cache_folder=cache,
        )
        logger.info("✅ Local embedding model ready")
    return _local_model


async def _embed_local(texts: list) -> list:
    loop = asyncio.get_event_loop()
    def _run():
        model = _get_local_model()
        vecs = model.encode(texts, batch_size=32, show_progress_bar=False)
        return [v.tolist() for v in vecs]
    return await loop.run_in_executor(None, _run)


# ── Gemini ────────────────────────────────────────────────────────────────────

async def _embed_gemini(texts: list, task_type: str = "retrieval_document") -> list:
    loop = asyncio.get_event_loop()
    def _run():
        global _gemini_ready
        import google.generativeai as genai
        if not _gemini_ready:
            genai.configure(api_key=settings.gemini_api_key)
            _gemini_ready = True
        results = []
        for text in texts:
            resp = genai.embed_content(
                model=settings.gemini_embedding_model,
                content=text,
                task_type=task_type,
            )
            results.append(resp["embedding"])
        return results
    return await loop.run_in_executor(None, _run)


# ── OpenAI ────────────────────────────────────────────────────────────────────

async def _embed_openai(texts: list) -> list:
    global _openai_client
    if _openai_client is None:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    result = []
    for i in range(0, len(texts), 100):
        resp = await _openai_client.embeddings.create(
            input=texts[i:i+100], model=settings.embedding_model
        )
        result.extend(item.embedding for item in resp.data)
    return result
