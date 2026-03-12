# ── Backend API Image ─────────────────────────────────────────────────────────
# Optimisations:
#   - python:3.12-slim base (~45 MB vs ~900 MB for full image)
#   - torch CPU-only wheel (saves ~600 MB vs default GPU build)
#   - pip --no-cache-dir (no pip cache left in layer)
#   - combine RUN steps to reduce layer count
#   - .dockerignore excludes tests, docs, __pycache__, venv

FROM python:3.12-slim

WORKDIR /app

# Install only essential OS packages in one layer, then clean up
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first — Docker caches this layer until requirements.txt changes
COPY requirements.txt .

# 1. Install torch CPU-only (saves ~600 MB vs default CUDA build)
# 2. Install remaining packages
# 3. Pre-download the local fallback embedding model into the image layer
#    so the first query isn't slow (falls back silently if download fails)
RUN pip install --no-cache-dir torch==2.5.1 \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt \
    && python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('all-MiniLM-L6-v2', cache_folder='/data/model_cache')" \
    || true

# Copy application source (tests and docs excluded via .dockerignore)
COPY . .

# Create runtime data directories
RUN mkdir -p /data/chromadb /data/uploads /data/model_cache

# Silence ChromaDB telemetry errors
ENV ANONYMIZED_TELEMETRY=false
ENV CHROMA_TELEMETRY=false

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--loop", "uvloop", \
     "--http", "httptools"]
