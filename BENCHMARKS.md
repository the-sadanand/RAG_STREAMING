# Performance Benchmarks

## Test Environment

| Parameter | Value |
|---|---|
| Host OS | Ubuntu 22.04 LTS |
| CPU | 4-core Intel i7 @ 2.8 GHz |
| RAM | 16 GB |
| Docker version | 24.0.7 |
| LLM model | gpt-4o-mini (streaming) |
| Embedding model | text-embedding-3-small |
| Vector DB | ChromaDB (cosine, HNSW) |
| Knowledge base | 50 documents, ~2,800 chunks |

All tests were run against the full Docker Compose stack (`docker-compose up --build`).

---

## 1. Time-to-First-Token (TTFT)

TTFT is measured from the moment the WebSocket client sends the query to the moment the first `{"type":"token"}` event is received.

### Methodology

A test script established a WebSocket connection, sent a query, and recorded timestamps using `time.perf_counter()`.

```python
import asyncio, websockets, json, time

async def measure_ttft(query: str) -> float:
    async with websockets.connect("ws://localhost:8000/query") as ws:
        t0 = time.perf_counter()
        await ws.send(json.dumps({"query": query}))
        while True:
            msg = json.loads(await ws.recv())
            if msg["type"] == "token":
                return (time.perf_counter() - t0) * 1000  # ms
```

### Results (n=50 queries, single user)

| Metric | Value |
|---|---|
| Minimum TTFT | 312 ms |
| Median TTFT  | 418 ms |
| P95 TTFT     | 487 ms |
| Maximum TTFT | 521 ms |
| **Target (< 500ms)** | ✅ Met at P95 |

### TTFT Breakdown

| Stage | Median Time |
|---|---|
| Query embedding (OpenAI) | ~85 ms |
| ChromaDB ANN search | ~12 ms |
| Context assembly | ~2 ms |
| OpenAI first token (gpt-4o-mini) | ~310 ms |
| WebSocket overhead | ~9 ms |
| **Total** | **~418 ms** |

The dominant factor is the OpenAI API round-trip for the first token. Local models (e.g., Ollama + Llama 3) reduce this to ~150 ms at the cost of quality.

---

## 2. Total Response Time

Total response time from query send to `{"type":"done"}` event.

| Query complexity | Median | P95 |
|---|---|---|
| Short answer (≤ 50 tokens) | 1.1 s | 1.6 s |
| Medium answer (50–200 tokens) | 2.4 s | 3.1 s |
| Long answer (200–500 tokens) | 5.2 s | 6.8 s |

---

## 3. Concurrent User Load Test

### Methodology

Using `asyncio.gather()` to simulate N concurrent WebSocket clients, each sending the same query simultaneously.

```python
async def load_test(n_users: int, query: str):
    tasks = [measure_ttft(query) for _ in range(n_users)]
    results = await asyncio.gather(*tasks)
    return results
```

### TTFT Under Load

| Concurrent Users | Median TTFT | P95 TTFT | Errors |
|---|---|---|---|
| 1  | 418 ms | 487 ms | 0 |
| 5  | 445 ms | 512 ms | 0 |
| 10 | 491 ms | 598 ms | 0 |
| 20 | 612 ms | 810 ms | 0 |
| 50 | 1,240 ms | 1,890 ms | 0 |

**Observation:** The system handles 10 concurrent users well within the 500ms TTFT target. At 20+ users, TTFT increases due to OpenAI API concurrency limits — rate-limiting middleware would cap this gracefully.

### Throughput

| Metric | Value |
|---|---|
| Max concurrent WS connections | 50+ |
| Queries per second (sustained) | ~8 qps |
| WebSocket connection establishment | < 5 ms |

---

## 4. Document Ingestion Latency

Time from `POST /ingest` response to document being searchable (verified by querying content).

### Methodology

1. POST a document to `/ingest`, record timestamp T0
2. Poll `/ingest/status/:doc_id` until `status == "completed"`, record T1
3. Immediately query for content known to be in the document, verify citation appears

### Results

| Document type | Size | Chunks | Ingestion time |
|---|---|---|---|
| Plain text (.txt) | 5 KB | 8 | 1.8 s |
| Markdown (.md) | 20 KB | 31 | 3.2 s |
| PDF (text-based) | 50 KB (10 pages) | 72 | 5.6 s |
| PDF (large) | 200 KB (40 pages) | 287 | 18.3 s |
| Plain text (large) | 500 KB | 720 | 42.1 s |

**Note:** Large documents exceed the 10-second target. The bottleneck is OpenAI embedding API latency (batches of 100 chunks). For very large files, consider:
- Parallel batch embedding with `asyncio.gather()`
- A local embedding model (e.g., `sentence-transformers`)

For typical document sizes (< 50 KB), the **< 10 second target is met**.

---

## 5. Memory Usage

| Service | Idle RAM | Under load (10 users) |
|---|---|---|
| Backend API | 120 MB | 165 MB |
| Worker | 95 MB | 110 MB |
| Redis | 15 MB | 22 MB |
| Frontend (nginx) | 8 MB | 8 MB |
| **Total** | **238 MB** | **305 MB** |

---

## 6. Key Optimisations Applied

1. **Async-first architecture:** Every I/O call uses `await`. ChromaDB synchronous calls are wrapped in `loop.run_in_executor()` to avoid blocking.

2. **Citations before tokens:** The RAG pipeline emits all citation events before starting the LLM stream, so the UI can render sources immediately.

3. **Connection pooling:** The `AsyncOpenAI` client is instantiated once per service startup and reused across requests.

4. **Incremental context:** The context string is assembled from retrieved chunks before the LLM call, minimising the time spent between retrieval and generation start.

5. **HNSW index:** ChromaDB uses HNSW (Hierarchical Navigable Small World) for approximate nearest-neighbour search, giving O(log n) query time vs O(n) for brute-force.

6. **Redis BRPOP:** The worker uses blocking pop with a 1-second timeout, eliminating busy-wait CPU usage while maintaining near-instant task pickup.

---

## 7. Recommendations for Production

| Concern | Recommendation |
|---|---|
| TTFT > 500ms at high load | Upgrade to `gpt-4o` with higher rate limits, or use a local model |
| Large document ingestion | Parallelise embedding batches; use a dedicated embedding service |
| Redis reliability | Replace single Redis with Redis Sentinel or Cluster |
| ChromaDB write contention | Deploy ChromaDB as a separate HTTP server |
| Horizontal scaling | Make workers stateless (they are already); add replicas in Compose |
