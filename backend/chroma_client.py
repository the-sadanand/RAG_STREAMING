from __future__ import annotations

"""
Single shared ChromaDB client factory.
Import get_chroma_client() everywhere instead of constructing PersistentClient
directly — guarantees identical settings across backend and worker processes.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import get_settings

_settings = get_settings()

CHROMA_SETTINGS = ChromaSettings(
    anonymized_telemetry=False,
    allow_reset=True,
)

_client = None  # chromadb.PersistentClient, lazily created


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=_settings.vector_db_path,
            settings=CHROMA_SETTINGS,
        )
    return _client
