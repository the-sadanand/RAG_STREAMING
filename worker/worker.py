from __future__ import annotations

"""Background ingestion worker — consumes tasks from Redis and indexes documents."""

import asyncio
import json
import logging
import os
import signal
import sys

import redis.asyncio as aioredis

sys.path.insert(0, "/app")

from config import get_settings
from ingestion.processor import DocumentProcessor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WORKER] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


class IngestionWorker:
    def __init__(self):
        self.redis = None
        self.processor = None
        self.running = True

    async def start(self):
        logger.info("Worker starting…")

        # Connect to Redis with retries
        self.redis = aioredis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            decode_responses=True,
        )
        for attempt in range(1, 16):
            try:
                await self.redis.ping()
                logger.info("✅ Redis connected")
                break
            except Exception as exc:
                logger.warning(f"Redis not ready ({attempt}/15): {exc}")
                await asyncio.sleep(2)
        else:
            logger.error("Cannot connect to Redis — exiting")
            sys.exit(1)

        os.makedirs(settings.vector_db_path, exist_ok=True)
        os.makedirs(settings.upload_path, exist_ok=True)

        self.processor = DocumentProcessor()

        # Log active provider so it's visible immediately in docker logs
        import embeddings as emb
        logger.info(f"✅ Embedding provider : {emb.get_provider_name()}")
        logger.info(f"✅ Embedding dimension: {emb.get_embedding_dimension()}")

        await self._loop()

    async def stop(self):
        self.running = False
        if self.redis:
            await self.redis.aclose()
        logger.info("Worker stopped")

    async def _loop(self):
        logger.info(f"Listening on '{settings.ingestion_queue}'…")
        while self.running:
            try:
                result = await self.redis.brpop(settings.ingestion_queue, timeout=1)
                if result is None:
                    continue
                _, raw = result
                await self._handle(json.loads(raw))
            except json.JSONDecodeError as exc:
                logger.error(f"Bad task JSON: {exc}")
            except Exception as exc:
                if self.running:
                    logger.error(f"Loop error: {exc}", exc_info=True)
                    await asyncio.sleep(1)

    async def _handle(self, task: dict):
        doc_id = task["doc_id"]
        filename = task["filename"]
        file_path = task["file_path"]
        content_type = task.get("content_type", "text/plain")

        logger.info(f"📄 Processing '{filename}' (id={doc_id})")
        await self._set_status(doc_id, "processing", filename)

        try:
            content = await self._read_file(file_path, content_type)
            logger.info(f"Read {len(content)} chars from '{filename}'")

            result = await self.processor.process_document(content, filename, doc_id)
            await self._set_status(doc_id, "completed", filename, {"chunks": result["chunks"]})
            logger.info(f"✅ '{filename}' done — {result['chunks']} chunks")

        except Exception as exc:
            logger.error(f"❌ Failed '{filename}': {exc}", exc_info=True)
            await self._set_status(doc_id, "failed", filename, {"error": str(exc)})

        finally:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass

    async def _read_file(self, path: str, content_type: str) -> str:
        loop = asyncio.get_event_loop()
        if path.lower().endswith(".pdf") or "pdf" in content_type:
            return await loop.run_in_executor(None, self._parse_pdf, path)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    @staticmethod
    def _parse_pdf(path: str) -> str:
        from pypdf import PdfReader
        reader = PdfReader(path)
        pages = [p.extract_text() for p in reader.pages if p.extract_text()]
        if not pages:
            raise ValueError("PDF has no extractable text (may be a scanned image)")
        return "\n\n".join(pages)

    async def _set_status(self, doc_id: str, status: str, filename: str, extra: dict = None):
        payload = {"status": status, "filename": filename, **(extra or {})}
        await self.redis.setex(f"ingest_status:{doc_id}", 3600, json.dumps(payload))
        await self.redis.publish(
            settings.ingestion_status_channel,
            json.dumps({"doc_id": doc_id, **payload}),
        )


async def main():
    worker = IngestionWorker()
    loop = asyncio.get_event_loop()

    def _shutdown(sig, _):
        logger.info(f"Signal {signal.Signals(sig).name} received — shutting down")
        loop.create_task(worker.stop())

    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, _shutdown)

    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())
