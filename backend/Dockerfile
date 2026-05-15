# ──────────────────────────────────────
# Stage 1: Build dependencies
# ──────────────────────────────────────
FROM python:3.13-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ──────────────────────────────────────
# Stage 2: Runtime
# ──────────────────────────────────────
FROM python:3.13-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Create directories the app expects at runtime
RUN mkdir -p /app/logs /app/runs /app/store

# Default port (Render injects $PORT at runtime)
ENV PORT=8000
EXPOSE ${PORT}

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run with uvicorn; bind to 0.0.0.0 so it is reachable outside the container
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
