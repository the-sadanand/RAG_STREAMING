"""
Integration tests for the FastAPI endpoints.
Run with: pytest tests/test_api.py -v
"""

import asyncio
import json
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_dependencies():
    """Mock external dependencies so tests run without Redis/OpenAI."""
    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.lpush = AsyncMock(return_value=1)
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.setex = AsyncMock()
    mock_redis.publish = AsyncMock()
    mock_redis.aclose = AsyncMock()

    mock_pipeline = MagicMock()

    async def fake_stream(query):
        yield {"type": "status", "payload": "Searching…"}
        yield {"type": "citation", "payload": {"source": "test.txt", "chunk_index": 0, "score": 0.9, "preview": "…"}}
        yield {"type": "token", "payload": "Hello"}
        yield {"type": "token", "payload": " world"}
        yield {"type": "done", "payload": ""}

    mock_pipeline.stream_query = fake_stream

    with (
        patch("main.aioredis.Redis", return_value=mock_redis),
        patch("main.RAGPipeline", return_value=mock_pipeline),
    ):
        # Re-import app after patching
        import main
        main.redis_client = mock_redis
        main.rag_pipeline = mock_pipeline
        yield mock_redis, mock_pipeline


@pytest.fixture
def client():
    from main import app
    with TestClient(app) as c:
        yield c


# ── Health check ──────────────────────────────────────────────────────────────

def test_health_ok(client):
    with patch("main.AsyncRetriever") as mock_ret:
        mock_ret.return_value.collection_stats = AsyncMock(return_value={"total_chunks": 10})
        resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "version" in data


# ── Ingest endpoint ───────────────────────────────────────────────────────────

def test_ingest_txt_accepted(client, mock_dependencies):
    mock_redis, _ = mock_dependencies
    file_content = b"This is a test document about artificial intelligence."
    resp = client.post(
        "/ingest",
        files={"file": ("test.txt", BytesIO(file_content), "text/plain")},
    )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "queued"
    assert "doc_id" in data
    assert data["filename"] == "test.txt"


def test_ingest_pdf_accepted(client, mock_dependencies):
    # Minimal fake PDF bytes
    resp = client.post(
        "/ingest",
        files={"file": ("report.pdf", BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert resp.status_code == 202


def test_ingest_unsupported_type_rejected(client):
    resp = client.post(
        "/ingest",
        files={"file": ("image.png", BytesIO(b"\x89PNG"), "image/png")},
    )
    assert resp.status_code == 400


def test_ingest_publishes_to_redis(client, mock_dependencies):
    mock_redis, _ = mock_dependencies
    file_content = b"Document for queue test."
    client.post(
        "/ingest",
        files={"file": ("queue_test.txt", BytesIO(file_content), "text/plain")},
    )
    mock_redis.lpush.assert_called_once()
    call_args = mock_redis.lpush.call_args
    queue_name = call_args[0][0]
    assert queue_name == "ingestion_queue"


# ── Ingestion status ──────────────────────────────────────────────────────────

def test_ingestion_status_unknown(client, mock_dependencies):
    mock_redis, _ = mock_dependencies
    mock_redis.get = AsyncMock(return_value=None)
    resp = client.get("/ingest/status/nonexistent-id")
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending_or_unknown"


def test_ingestion_status_completed(client, mock_dependencies):
    mock_redis, _ = mock_dependencies
    mock_redis.get = AsyncMock(
        return_value=json.dumps({"status": "completed", "filename": "doc.txt", "chunks": 5})
    )
    resp = client.get("/ingest/status/some-real-id")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["chunks"] == 5


# ── WebSocket ─────────────────────────────────────────────────────────────────

def test_websocket_streams_events(client, mock_dependencies):
    with client.websocket_connect("/query") as ws:
        ws.send_text(json.dumps({"query": "What is AI?"}))
        events = []
        while True:
            msg = ws.receive_json()
            events.append(msg)
            if msg["type"] in ("done", "error"):
                break

    types = [e["type"] for e in events]
    assert "status" in types
    assert "citation" in types
    assert "token" in types
    assert "done" in types


def test_websocket_empty_query_returns_error(client):
    with client.websocket_connect("/query") as ws:
        ws.send_text(json.dumps({"query": ""}))
        msg = ws.receive_json()
    assert msg["type"] == "error"


def test_websocket_plain_text_query(client, mock_dependencies):
    with client.websocket_connect("/query") as ws:
        ws.send_text("plain text query")
        events = []
        while True:
            msg = ws.receive_json()
            events.append(msg)
            if msg["type"] in ("done", "error"):
                break
    assert any(e["type"] == "token" for e in events)
