from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from rag.pipeline import RAGPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".md"}

redis_client: aioredis.Redis = None
pipeline: RAGPipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, pipeline
    os.makedirs(settings.upload_path, exist_ok=True)
    os.makedirs(settings.vector_db_path, exist_ok=True)

    redis_client = aioredis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_db,
        decode_responses=True,
    )
    pipeline = RAGPipeline()
    logger.info("✅ Backend ready")
    yield
    await redis_client.aclose()


app = FastAPI(
    title="RAG Streaming API",
    description="Full-stack RAG with token streaming and async ingestion",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health():
    import embeddings as emb
    redis_ok = False
    try:
        await redis_client.ping()
        redis_ok = True
    except Exception:
        pass
    return {
        "status": "healthy" if redis_ok else "degraded",
        "redis": "connected" if redis_ok else "disconnected",
        "embedding_provider": emb.get_provider_name(),
        "version": "1.0.0",
    }


# ── Debug ─────────────────────────────────────────────────────────────────────

@app.get("/debug", tags=["system"])
async def debug():
    """Live health check of every component. Use this to diagnose issues."""
    import embeddings as emb

    results = {}

    # Env / config
    s = settings
    results["env"] = {
        "GEMINI_API_KEY_set":    bool(s.gemini_api_key and len(s.gemini_api_key) > 10),
        "GEMINI_API_KEY_prefix": (s.gemini_api_key[:8] + "...") if s.gemini_api_key else "MISSING",
        "OPENAI_API_KEY_set":    bool(s.openai_api_key and s.openai_api_key.startswith("sk-")),
        "EMBEDDING_PROVIDER":    s.embedding_provider,
        "LLM_PROVIDER":          s.llm_provider,
        "active_provider":       emb.get_provider_name(),
    }

    # Redis
    try:
        await redis_client.ping()
        results["redis"] = "ok"
    except Exception as e:
        results["redis"] = f"FAILED: {e}"

    # Live embedding test
    try:
        vec = await emb.embed_query("hello world")
        results["embedding_test"] = {"status": "ok", "dimension": len(vec), "sample": vec[:3]}
    except Exception as e:
        results["embedding_test"] = {"status": f"FAILED: {e}"}

    # ChromaDB
    try:
        from chroma_client import get_chroma_client
        loop = asyncio.get_event_loop()
        cols = await loop.run_in_executor(None, lambda: get_chroma_client().list_collections())
        results["chromadb"] = {"status": "ok", "collections": len(cols)}
    except Exception as e:
        results["chromadb"] = f"FAILED: {e}"

    failed = [
        k for k, v in results.items()
        if (isinstance(v, str) and "FAILED" in v)
        or (isinstance(v, dict) and "FAILED" in str(v.get("status", "")))
    ]
    results["overall"] = "ALL OK ✅" if not failed else f"FAILURES in: {failed}"
    return results


# ── WebSocket query ───────────────────────────────────────────────────────────

@app.websocket("/query")
async def ws_query(ws: WebSocket):
    await ws.accept()
    logger.info(f"[WS] Client connected: {ws.client}")
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
                query = (data.get("query") or "").strip()
            except json.JSONDecodeError:
                query = raw.strip()

            if not query:
                await ws.send_text(json.dumps({"type": "error", "payload": "Empty query"}))
                continue

            logger.info(f"[WS] Query: {query!r}")
            async for event in pipeline.stream_query(query):
                await ws.send_text(json.dumps(event))

    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected")
    except Exception as exc:
        logger.error(f"[WS] Unexpected error: {exc}", exc_info=True)
        try:
            await ws.send_text(json.dumps({"type": "error", "payload": str(exc)}))
        except Exception:
            pass


# ── Ingest ────────────────────────────────────────────────────────────────────

@app.post("/ingest", status_code=202, tags=["ingestion"])
async def ingest(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_file_size_mb} MB limit")

    doc_id = str(uuid.uuid4())
    safe_name = os.path.basename(file.filename or "upload")
    file_path = os.path.join(settings.upload_path, f"{doc_id}_{safe_name}")

    with open(file_path, "wb") as fh:
        fh.write(content)

    task = json.dumps({
        "doc_id":       doc_id,
        "filename":     safe_name,
        "file_path":    file_path,
        "content_type": file.content_type or "text/plain",
    })

    try:
        await redis_client.lpush(settings.ingestion_queue, task)
    except Exception as exc:
        raise HTTPException(503, f"Queue unavailable: {exc}")

    logger.info(f"Queued '{safe_name}' (id={doc_id})")
    return {"message": "Queued", "doc_id": doc_id, "filename": safe_name, "status": "queued"}


@app.get("/ingest/status/{doc_id}", tags=["ingestion"])
async def ingest_status(doc_id: str):
    raw = await redis_client.get(f"ingest_status:{doc_id}")
    if raw is None:
        return {"doc_id": doc_id, "status": "unknown"}
    return {"doc_id": doc_id, **json.loads(raw)}


@app.get("/documents", tags=["ingestion"])
async def list_documents():
    try:
        from chroma_client import get_chroma_client
        loop = asyncio.get_event_loop()

        def _get():
            client = get_chroma_client()
            col = client.get_or_create_collection("documents")
            result = col.get(include=["metadatas"])
            docs = {}
            for meta in (result["metadatas"] or []):
                src = meta.get("source", "unknown")
                docs[src] = docs.get(src, 0) + 1
            return [{"source": k, "chunks": v} for k, v in sorted(docs.items())]

        documents = await loop.run_in_executor(None, _get)
        return {"documents": documents, "total": len(documents)}
    except Exception as exc:
        logger.error(f"list_documents error: {exc}", exc_info=True)
        return {"documents": [], "total": 0}
