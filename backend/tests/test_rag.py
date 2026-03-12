"""
Unit tests for RAG core components.
Run with: pytest tests/test_rag.py -v
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ingestion.processor import DocumentProcessor


# ── DocumentProcessor ─────────────────────────────────────────────────────────

class TestDocumentProcessor:
    def test_chunk_text_basic(self):
        text = " ".join([f"word{i}" for i in range(1000)])
        chunks = DocumentProcessor.chunk_text(text, "test.txt")
        assert len(chunks) > 1
        for chunk in chunks:
            assert "text" in chunk
            assert "metadata" in chunk
            assert chunk["metadata"]["source"] == "test.txt"
            assert "chunk_index" in chunk["metadata"]

    def test_chunk_text_overlap(self):
        from config import get_settings
        settings = get_settings()
        text = " ".join([f"word{i}" for i in range(settings.chunk_size * 2)])
        chunks = DocumentProcessor.chunk_text(text, "overlap_test.txt")
        assert len(chunks) >= 2
        words_c0 = chunks[0]["text"].split()
        words_c1 = chunks[1]["text"].split()
        overlap_words = words_c0[-(settings.chunk_overlap):]
        assert overlap_words == words_c1[: len(overlap_words)]

    def test_chunk_text_empty_produces_no_chunks(self):
        chunks = DocumentProcessor.chunk_text("", "empty.txt")
        assert chunks == []

    def test_chunk_ids_are_unique(self):
        text = " ".join([f"word{i}" for i in range(2000)])
        chunks = DocumentProcessor.chunk_text(text, "unique.txt")
        ids = [c["id"] for c in chunks]
        assert len(ids) == len(set(ids))

    def test_chunk_metadata_fields(self):
        text = "Hello world this is a test document"
        chunks = DocumentProcessor.chunk_text(text, "meta_test.txt")
        assert len(chunks) >= 1
        meta = chunks[0]["metadata"]
        assert "source" in meta
        assert "chunk_index" in meta
        assert "word_count" in meta
        assert meta["word_count"] > 0


# ── RAG Pipeline event types ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pipeline_emits_correct_event_types():
    from rag.pipeline import RAGPipeline

    mock_retriever = MagicMock()
    mock_retriever.retrieve = AsyncMock(
        return_value=[
            {
                "content": "Artificial intelligence is transformative.",
                "metadata": {"source": "ai.txt", "chunk_index": 0},
                "score": 0.92,
            }
        ]
    )

    mock_generator = MagicMock()

    async def fake_stream(query, context):
        yield "AI"
        yield " is great"

    mock_generator.build_context = MagicMock(return_value="AI context here")
    mock_generator.stream = fake_stream

    pipeline = RAGPipeline.__new__(RAGPipeline)
    pipeline.retriever = mock_retriever
    pipeline.generator = mock_generator

    events = []
    async for event in pipeline.stream_query("What is AI?"):
        events.append(event)

    types = [e["type"] for e in events]
    assert "status" in types
    assert "citation" in types
    assert "token" in types
    assert "done" in types
    assert "error" not in types


@pytest.mark.asyncio
async def test_pipeline_emits_error_on_retriever_failure():
    from rag.pipeline import RAGPipeline

    mock_retriever = MagicMock()
    mock_retriever.retrieve = AsyncMock(side_effect=Exception("DB connection lost"))

    pipeline = RAGPipeline.__new__(RAGPipeline)
    pipeline.retriever = mock_retriever
    pipeline.generator = MagicMock()

    events = []
    async for event in pipeline.stream_query("test"):
        events.append(event)

    assert any(e["type"] == "error" for e in events)
    assert all(e["type"] != "token" for e in events)


@pytest.mark.asyncio
async def test_pipeline_no_documents_still_streams():
    from rag.pipeline import RAGPipeline

    mock_retriever = MagicMock()
    mock_retriever.retrieve = AsyncMock(return_value=[])

    mock_generator = MagicMock()

    async def fake_stream(q, c):
        yield "I don't have information on that."

    mock_generator.build_context = MagicMock(return_value="No docs")
    mock_generator.stream = fake_stream

    pipeline = RAGPipeline.__new__(RAGPipeline)
    pipeline.retriever = mock_retriever
    pipeline.generator = mock_generator

    events = []
    async for event in pipeline.stream_query("unknown topic"):
        events.append(event)

    assert any(e["type"] == "token" for e in events)
    assert any(e["type"] == "done" for e in events)
    assert not any(e["type"] == "citation" for e in events)


# ── LLMGenerator context builder ─────────────────────────────────────────────

def test_build_context_with_documents():
    from rag.generator import LLMGenerator

    docs = [
        {"content": "The sky is blue.", "metadata": {"source": "sky.txt", "chunk_index": 0}, "score": 0.9},
        {"content": "Water is H2O.", "metadata": {"source": "chem.txt", "chunk_index": 1}, "score": 0.8},
    ]
    context = LLMGenerator.build_context(docs)
    assert "sky.txt" in context
    assert "chem.txt" in context
    assert "The sky is blue." in context
    assert "Water is H2O." in context


def test_build_context_empty():
    from rag.generator import LLMGenerator
    context = LLMGenerator.build_context([])
    assert "No relevant documents" in context


# ── AsyncRetriever ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_retriever_returns_empty_on_empty_store():
    from rag.retriever import AsyncRetriever

    retriever = AsyncRetriever.__new__(AsyncRetriever)
    retriever._client = None
    retriever._collection = None

    mock_collection = MagicMock()
    mock_collection.count.return_value = 0

    # embed_query lives in the shared embeddings module
    with patch.object(type(retriever), "collection", new_callable=lambda: property(lambda self: mock_collection)):
        with patch("rag.retriever.emb_service.embed_query", new=AsyncMock(return_value=[0.1] * 768)):
            result = await retriever.retrieve("test query")
    assert result == []
