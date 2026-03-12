from __future__ import annotations

import hashlib
import logging

import embeddings as emb_service
from chroma_client import get_chroma_client
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class DocumentProcessor:
    def __init__(self):
        self._collection = None

    @property
    def collection(self):
        if self._collection is None:
            self._collection = get_chroma_client().get_or_create_collection(
                name="documents",
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    # ── Public ────────────────────────────────────────────────────────────────

    async def process_document(self, content: str, filename: str, doc_id: str) -> dict:
        chunks = self._chunk_text(content, filename)
        if not chunks:
            raise ValueError(f"No text content extracted from '{filename}'")

        logger.info(f"Created {len(chunks)} chunks for '{filename}'")

        texts = [c["text"] for c in chunks]
        vectors = await emb_service.embed_texts(texts, task_type="retrieval_document")

        # Remove old chunks for this source (idempotent re-upload)
        self._delete_by_source(filename)

        ids = [c["id"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        self.collection.add(
            ids=ids,
            embeddings=vectors,
            documents=texts,
            metadatas=metadatas,
        )
        logger.info(f"✅ Indexed {len(chunks)} chunks from '{filename}'")
        return {"chunks": len(chunks), "doc_id": doc_id}

    # ── Chunking ──────────────────────────────────────────────────────────────

    def _chunk_text(self, text: str, filename: str = "unknown") -> list[dict]:
        words = text.split()
        size = settings.chunk_size
        overlap = settings.chunk_overlap
        chunks = []
        step = size - overlap
        for start in range(0, len(words), step):
            window = words[start: start + size]
            if not window:
                break
            chunk_text = " ".join(window)
            chunk_id = hashlib.md5(chunk_text.encode()).hexdigest()[:16]
            chunks.append({
                "id": chunk_id,
                "text": chunk_text,
                "metadata": {
                    "source":      filename,
                    "chunk_index": len(chunks),
                    "word_count":  len(window),
                },
            })
            if start + size >= len(words):
                break
        return chunks

    def _delete_by_source(self, source: str) -> None:
        try:
            existing = self.collection.get(where={"source": source})
            if existing and existing.get("ids"):
                self.collection.delete(ids=existing["ids"])
                logger.debug(f"Removed {len(existing['ids'])} old chunks for '{source}'")
        except Exception as exc:
            logger.warning(f"Could not delete old chunks for '{source}': {exc}")
