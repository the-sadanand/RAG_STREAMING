# ── Ingestion Worker Image ────────────────────────────────────────────────────
# Shares the same base and dependencies as the backend to maximise
# Docker layer caching — if backend rebuilds, worker reuses cached layers.

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Use backend requirements so both images stay in sync
COPY backend/requirements.txt .

RUN pip install --no-cache-dir torch==2.5.1 \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt \
    && python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('all-MiniLM-L6-v2', cache_folder='/data/model_cache')" \
    || true

# Copy shared backend modules + worker entrypoint
COPY backend/ /app/
COPY worker/worker.py /app/worker.py

RUN mkdir -p /data/chromadb /data/uploads /data/model_cache

ENV ANONYMIZED_TELEMETRY=false
ENV CHROMA_TELEMETRY=false

CMD ["python", "-u", "worker.py"]
