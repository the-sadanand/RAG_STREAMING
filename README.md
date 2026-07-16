# RAG Intelligence — Real-Time Streaming RAG System

A production-grade, full-stack **Retrieval-Augmented Generation (RAG)** application that streams LLM-generated responses token-by-token while simultaneously processing new documents into its knowledge base in near real-time.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| **Token-by-token streaming** | WebSocket delivers each LLM token as it's generated |
| **Inline citations** | Source documents sent to the frontend *before* the response begins |
| **Async document ingestion** | Redis-backed pipeline processes uploads without blocking queries |
| **Sub-500ms TTFT** | Optimised async RAG chain targeting <500ms time-to-first-token |
| **Concurrent users** | Stateless WebSocket handlers support 10+ simultaneous sessions |
| **Idempotent ingestion** | Re-uploading a file replaces its chunks rather than duplicating |
| **Docker-first** | Single `docker-compose up` starts everything |

---

## 🏗️ Architecture Overview

```
Browser
  │
  ├─ WebSocket (/query) ──► FastAPI Backend ──► ChromaDB (vector store)
  │                                    │
  ├─ HTTP POST (/ingest) ──────────────┤
  │                                    ▼
  │                              Redis Queue
  │                                    │
  │                                    ▼
  │                         Background Worker ──► ChromaDB
  │
  └─ HTTP GET (/health, /documents, /ingest/status/:id)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full diagram and component descriptions.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.12 · FastAPI · Uvicorn |
| Real-time   | WebSockets (native FastAPI) |
| Message Queue | Redis 7 (LPUSH/BRPOP) |
| Vector DB   | ChromaDB (persistent, local) |
| Embeddings  | OpenAI `text-embedding-3-small` |
| LLM         | OpenAI `gpt-4o-mini` (streaming) |
| Frontend    | React 18 · Vite · Lucide Icons |
| Container   | Docker · Docker Compose v3.9 |

---

## 🚀 Quick Start

### 1. Prerequisites

- Docker ≥ 24 and Docker Compose v2
- An OpenAI API key

### 2. Clone & Configure

```bash
git clone https://github.com/the-sadanand/RAG_STREAMING
cd rag-streaming
cp .env.example .env
# Edit .env and set your LLM API_KEY 
```

### 3. Start All Services

```bash
docker-compose up --build -d
```

Services started:
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Backend Docs | http://localhost:8000/docs |
| Redis | localhost:6379 |

### 4. Verify Health

```bash
curl http://localhost:8000/health
# {"status":"healthy","redis":"connected","vector_store_chunks":0,"version":"1.0.0"}
```

### 5. Use the Application

1. Open **http://localhost:3000**
2. Drag & drop `.txt`, `.pdf`, or `.md` files into the sidebar upload zone
3. Watch the status update from *Queued → Processing → Indexed* (usually < 10 s)
4. Type a question in the input box and press **Enter**
5. Watch the response stream in token-by-token with source citations above

---

## 📡 API Reference

### `GET /health`
Returns system health including Redis and vector store status.

### `WebSocket /query`
Bi-directional WebSocket for streaming RAG queries.

**Client sends:**
```json
{ "query": "What does document X say about Y?" }
```

**Server emits (sequence):**
```json
{ "type": "status",   "payload": "Searching knowledge base…" }
{ "type": "citation", "payload": { "source": "doc.pdf", "chunk_index": 3, "score": 0.92, "preview": "…" } }
{ "type": "token",    "payload": "The" }
{ "type": "token",    "payload": " document" }
{ "type": "done",     "payload": "" }
```

**On error:**
```json
{ "type": "error", "payload": "LLM API rate limit exceeded" }
```

### `POST /ingest`
Upload a document for async processing.

```bash
curl -X POST http://localhost:8000/ingest \
  -F "file=@report.pdf"
# {"message":"Document ingestion initiated","doc_id":"…","status":"queued"}
```

### `GET /ingest/status/{doc_id}`
Poll ingestion progress.

```json
{ "doc_id": "…", "status": "completed", "filename": "report.pdf", "chunks": 42 }
```

### `GET /documents`
List all indexed documents with chunk counts.

---

## 🧪 Running Tests

```bash
# Inside Docker (recommended)
docker-compose exec backend pytest tests/ -v

# Local (requires Python 3.12 + deps installed)
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

---

## 🔧 Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | **Required.** OpenAI API key |
| `LLM_MODEL` | `gpt-4o-mini` | Chat completion model |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `VECTOR_DB_PATH` | `/data/chromadb` | ChromaDB storage path |
| `CHUNK_SIZE` | `512` | Words per chunk |
| `CHUNK_OVERLAP` | `64` | Overlap words between chunks |
| `TOP_K_RESULTS` | `5` | Retrieved chunks per query |
| `MAX_FILE_SIZE_MB` | `20` | Max upload size |

---

## 🔄 Swapping the LLM Provider

The `LLMGenerator` class in `backend/rag/generator.py` uses the OpenAI SDK. To switch providers:

- **Anthropic Claude**: Use `anthropic` SDK with `stream=True`
- **Local Ollama**: Point `base_url` to `http://ollama:11434/v1` with `openai` SDK
- **Cohere**: Use `cohere` SDK's streaming chat endpoint

---

## 📁 Project Structure

```
rag-streaming/
├── backend/
│   ├── main.py              # FastAPI app, WebSocket & REST endpoints
│   ├── config.py            # Pydantic-settings configuration
│   ├── rag/
│   │   ├── pipeline.py      # Orchestrates retrieval + generation → events
│   │   ├── retriever.py     # Async ChromaDB retriever
│   │   └── generator.py     # Async OpenAI streaming generator
│   ├── ingestion/
│   │   └── processor.py     # Chunking, embedding, ChromaDB upsert
│   ├── tests/
│   │   ├── test_api.py      # API integration tests
│   │   └── test_rag.py      # RAG unit tests
│   ├── requirements.txt
│   └── Dockerfile
├── worker/
│   ├── worker.py            # Standalone Redis consumer process
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root component
│   │   ├── hooks/
│   │   │   └── useWebSocket.js  # WS hook with reconnection
│   │   └── components/
│   │       ├── StatusBar.jsx
│   │       ├── DocumentUpload.jsx
│   │       ├── ResponseDisplay.jsx
│   │       └── QueryPanel.jsx
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yaml
├── .env.example
├── README.md
├── ARCHITECTURE.md
├── BENCHMARKS.md
└── submission.yml
```

---

## 🛠️ Development Mode (without Docker)

```bash
# Terminal 1 — Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2 — Backend
cd backend && pip install -r requirements.txt
cp ../.env.example ../.env  # fill in API key
uvicorn main:app --reload --port 8000

# Terminal 3 — Worker
cd backend && python ../worker/worker.py

# Terminal 4 — Frontend
cd frontend && npm install && npm run dev
# Visit http://localhost:5173
```
## Author : Sadanand Kr.
