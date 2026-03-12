from __future__ import annotations

import logging
from typing import AsyncGenerator

from .retriever import AsyncRetriever
from .generator import LLMGenerator

logger = logging.getLogger(__name__)


class RAGPipeline:
    def __init__(self):
        self.retriever = AsyncRetriever()
        self.generator = LLMGenerator()

    async def stream_query(self, query: str) -> AsyncGenerator[dict, None]:
        # 1. Status
        yield {"type": "status", "payload": "Searching knowledge base…"}

        # 2. Retrieve
        try:
            documents = await self.retriever.retrieve(query)
        except Exception as exc:
            logger.error("RAG pipeline error", exc_info=True)
            yield {"type": "error", "payload": str(exc)}
            return

        # 3. Citations
        for doc in documents:
            yield {
                "type": "citation",
                "payload": {
                    "source":      doc["metadata"].get("source", "unknown"),
                    "chunk_index": doc["metadata"].get("chunk_index", 0),
                    "score":       doc["score"],
                    "preview":     doc["content"][:250],
                },
            }

        # 4. Generate
        yield {"type": "status", "payload": "Generating response…"}
        context = self.generator.build_context(documents)

        try:
            async for token in self.generator.stream(query, context):
                yield {"type": "token", "payload": token}
        except Exception as exc:
            logger.error("Generator error", exc_info=True)
            yield {"type": "error", "payload": str(exc)}
            return

        yield {"type": "done", "payload": ""}
