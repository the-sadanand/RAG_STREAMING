from __future__ import annotations

import asyncio
import logging

import chromadb

import embeddings as emb_service
from chroma_client import get_chroma_client
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AsyncRetriever:
    def __init__(self):
        self._collection = None

    @property
    def collection(self) -> chromadb.Collection:
        if self._collection is None:
            self._collection = get_chroma_client().get_or_create_collection(
                name="documents",
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    async def retrieve(self, query: str, n_results: int = None) -> list[dict]:
        k = n_results or settings.top_k_results
        loop = asyncio.get_event_loop()

        def _count():
            return self.collection.count()

        count = await loop.run_in_executor(None, _count)
        if count == 0:
            return []

        vector = await emb_service.embed_query(query)

        def _query():
            return self.collection.query(
                query_embeddings=[vector],
                n_results=min(k, count),
                include=["documents", "metadatas", "distances"],
            )

        results = await loop.run_in_executor(None, _query)

        docs = []
        for content, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            docs.append({
                "content": content,
                "metadata": meta,
                "score": round(1 - dist, 4),
            })
        return docs
