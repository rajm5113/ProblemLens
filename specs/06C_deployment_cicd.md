# Spec 6C: Deployment & CI/CD

> **Status:** 📋 READY TO IMPLEMENT
> **Depends on:** Spec 6B (Backend Hardening) ✅
> **Scope:** Dockerize backend, containerize frontend build, configure CI/CD, deploy to cloud
> **Verification:** `docker compose up --build` works locally, GitHub Actions pass, live URLs respond

---

## 1. Purpose

The platform is feature-complete and production-hardened. It runs perfectly on `localhost`. But it isn't accessible to anyone else:

1. **No containerization** — The backend requires a specific Python venv, manual `pip install`, and `.env` file setup. Reproducing the environment on a fresh machine is error-prone.
2. **No CI/CD** — There's no automated check that tests pass before code is merged. A broken `config.py` import or a failing test could ship unnoticed.
3. **No cloud deployment** — The API runs on `localhost:8000` and the frontend on `localhost:5173`. Nobody outside the local network can access the product.
4. **No production build pipeline** — The frontend needs `npm run build` to produce static assets, but there's no standardized way to serve them alongside the API.

This spec solves all four problems with a minimal, battle-tested stack:

| Layer | Tool | Why |
|-------|------|-----|
| Containerization | Docker + Docker Compose | Industry standard, free, works everywhere |
| CI/CD | GitHub Actions | Free for public repos, native to GitHub |
| Backend hosting | Render (Web Service) | Free tier, auto-deploy from GitHub, supports Docker |
| Frontend hosting | Render (Static Site) | Free tier, Vite build output served via CDN |

---

## 2. Dockerization — Backend

### 2.1 Dockerfile Strategy

The backend Dockerfile uses a **multi-stage build** to keep the final image small:

1. **Stage 1 — Builder:** Install dependencies in a clean Python image.
2. **Stage 2 — Runtime:** Copy only the installed packages and source code. No pip, no gcc, no build tools in the final image.

### 2.2 Implementation

**`backend/Dockerfile`** — new file:

```dockerfile
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

# Create directories the app expects
RUN mkdir -p /app/logs /app/runs /app/store

# Default port for Cloud Run / Render
ENV PORT=8000
EXPOSE ${PORT}

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run with uvicorn
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.3 Dockerignore

**`backend/.dockerignore`** — new file:

```
.venv/
.env
.pytest_cache/
.pytest_tmp/
__pycache__/
*.py[cod]
logs/
runs/
store/*.db
store/*.db-*
tests/
.git/
```

> **Note:** `.env` is excluded from the image. Environment variables are injected at runtime via Docker Compose or the cloud platform's env var settings.

### 2.4 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `python:3.13-slim` (not alpine) | Alpine causes C extension build issues with `pydantic`, `httpx`, etc. Slim is ~150MB lighter than full image but fully compatible. |
| Multi-stage build | Final image has no build tools → smaller attack surface, faster pulls |
| `CMD` not `ENTRYPOINT` | Allows easy override for debugging (`docker run ... bash`) |
| No `.env` COPY | Secrets are injected via environment, never baked into images |
| `mkdir` for logs/runs/store | Prevents FileNotFoundError on first boot in a clean container |

---

## 3. Dockerization — Frontend Build

### 3.1 Strategy

The frontend is a static site — Vite builds it into `dist/`. We use a **build-stage Dockerfile** that compiles the React app and outputs a directory of static files.

For Render deployment, we don't need a Dockerfile for the frontend — Render's static site service can run `npm run build` directly. But we include one for local Docker Compose parity.

### 3.2 Implementation

**`app/Dockerfile`** — new file:

```dockerfile
# ──────────────────────────────────────
# Stage 1: Build the frontend
# ──────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ──────────────────────────────────────
# Stage 2: Serve with lightweight static server
# ──────────────────────────────────────
FROM node:20-slim

WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

ENV PORT=3000
EXPOSE ${PORT}

CMD ["serve", "-s", "dist", "-l", "3000"]
```

### 3.3 Dockerignore

**`app/.dockerignore`** — new file:

```
node_modules/
dist/
.env
.git/
guidelines/
```

### 3.4 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `node:20-slim` | Matches the LTS Node version, slim for smaller image |
| `npm ci` (not `npm install`) | Deterministic installs from lockfile — critical for CI |
| `ARG VITE_API_BASE_URL` | Allows injecting the backend URL at build time for different environments |
| `serve` for static hosting | Lightweight, SPA-friendly (handles client-side routing), zero config |
| Separate from backend | Keeps concerns separated; frontend can be deployed independently |

---

## 4. Docker Compose — Local Orchestration

### 4.1 Purpose

One command to start the entire platform locally: `docker compose up --build`.

### 4.2 Implementation

**`docker-compose.yml`** — new file at project root:

```yaml
version: "3.9"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - PRIMARY_PROVIDER=${PRIMARY_PROVIDER:-gemini}
      - FALLBACK_PROVIDER=${FALLBACK_PROVIDER:-openai}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
      - ENABLE_SCHEDULER=${ENABLE_SCHEDULER:-false}
      - DISCOVERY_INTERVAL_HOURS=${DISCOVERY_INTERVAL_HOURS:-6}
      - PIPELINE_API_KEY=${PIPELINE_API_KEY:-}
      - CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000
      - GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.0-flash}
    volumes:
      - backend-data:/app/store
      - backend-logs:/app/logs
      - backend-runs:/app/runs
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  frontend:
    build:
      context: ./app
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: http://localhost:8000/api
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  backend-data:
  backend-logs:
  backend-runs:
```

### 4.3 Usage

```bash
# Start everything (first time or after code changes)
docker compose up --build

# Start in background
docker compose up --build -d

# View logs
docker compose logs -f backend

# Stop everything
docker compose down

# Stop and remove data volumes
docker compose down -v
```

### 4.4 Environment Variables

Docker Compose reads from a `.env` file in the project root automatically. Create one:

**`.env`** (project root, git-ignored):

```
GEMINI_API_KEY=your-key-here
PIPELINE_API_KEY=your-pipeline-key
ENABLE_SCHEDULER=false
```

---

## 5. CI/CD — GitHub Actions

### 5.1 Strategy

Two workflows:

1. **`ci.yml`** — Runs on every push and PR. Validates that both backend and frontend build cleanly.
2. No auto-deploy workflow — Render auto-deploys from the `main` branch via its GitHub integration. This keeps the CI pipeline simple and avoids storing deploy keys.

### 5.2 Implementation

**`.github/workflows/ci.yml`** — new file:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.13
        uses: actions/setup-python@v5
        with:
          python-version: "3.13"
          cache: "pip"
          cache-dependency-path: backend/requirements.txt

      - name: Install dependencies
        working-directory: backend
        run: pip install -r requirements.txt

      - name: Run tests
        working-directory: backend
        env:
          GEMINI_API_KEY: "test-dummy-key"
          PIPELINE_API_KEY: ""
        run: python -m pytest --tb=short -q

  frontend-build:
    name: Frontend Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: app/package-lock.json

      - name: Install dependencies
        working-directory: app
        run: npm ci

      - name: Build
        working-directory: app
        env:
          VITE_API_BASE_URL: "https://problemlens-api.onrender.com/api"
        run: npm run build

  docker-build:
    name: Docker Build Check
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-build]

    steps:
      - uses: actions/checkout@v4

      - name: Build backend image
        run: docker build -t problemlens-backend ./backend

      - name: Build frontend image
        run: docker build -t problemlens-frontend --build-arg VITE_API_BASE_URL=http://localhost:8000/api ./app
```

### 5.3 CI Pipeline Flow

```
Push/PR to main
    ├── Backend Tests (Python 3.13, pytest)
    ├── Frontend Build (Node 20, npm ci + vite build)
    └── Docker Build Check (builds both images, no push)
```

### 5.4 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `GEMINI_API_KEY: "test-dummy-key"` | Tests don't call the real Gemini API. The key just needs to be non-empty to avoid `require_env` errors. |
| `PIPELINE_API_KEY: ""` | Tests run in dev mode (no API key required for pipeline endpoint). |
| `npm ci` (not `npm install`) | Deterministic, faster, CI-appropriate |
| Docker build as a separate job with `needs` | Only runs if tests and build pass — saves CI minutes |
| No deploy step | Render's GitHub integration auto-deploys on main. Keeps CI simple. |

---

## 6. Cloud Deployment — Render

### 6.1 Architecture

```
┌─────────────────┐    HTTPS     ┌──────────────────┐
│   Frontend      │ ──────────── │   Backend         │
│  (Static Site)  │   API calls  │  (Web Service)    │
│  Render CDN     │              │  Render Docker    │
│  port 443       │              │  port 8000        │
└─────────────────┘              └──────────────────┘
       │                                  │
       │ dist/                            │ SQLite + store/
       │ (Vite build)                     │ (persistent disk)
```

### 6.2 Backend — Render Web Service

**Settings:**

| Field | Value |
|-------|-------|
| Name | `problemlens-api` |
| Environment | Docker |
| Root Directory | `backend` |
| Dockerfile Path | `./Dockerfile` |
| Instance Type | Free |
| Health Check Path | `/api/health` |

**Environment Variables (Render Dashboard):**

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | `<your actual key>` |
| `PRIMARY_PROVIDER` | `gemini` |
| `ENABLE_SCHEDULER` | `true` |
| `DISCOVERY_INTERVAL_HOURS` | `6` |
| `PIPELINE_API_KEY` | `<generate a strong random key>` |
| `CORS_ORIGINS` | `https://problemlens.onrender.com,http://localhost:5173` |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `LOG_LEVEL` | `INFO` |

### 6.3 Frontend — Render Static Site

**Settings:**

| Field | Value |
|-------|-------|
| Name | `problemlens` |
| Root Directory | `app` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `app/dist` |
| Environment Variable | `VITE_API_BASE_URL=https://problemlens-api.onrender.com/api` |

**Rewrite Rule (for SPA routing):**

Add a rewrite rule so that all paths serve `index.html` (required for hash-based deep links):

| Source | Destination | Action |
|--------|-------------|--------|
| `/*` | `/index.html` | Rewrite |

### 6.4 render.yaml — Infrastructure as Code (Optional)

For reproducible deploys, add a `render.yaml` at the project root:

**`render.yaml`** — new file:

```yaml
services:
  - type: web
    name: problemlens-api
    runtime: docker
    rootDir: backend
    dockerfilePath: ./Dockerfile
    plan: free
    healthCheckPath: /api/health
    envVars:
      - key: GEMINI_API_KEY
        sync: false
      - key: PRIMARY_PROVIDER
        value: gemini
      - key: ENABLE_SCHEDULER
        value: "true"
      - key: DISCOVERY_INTERVAL_HOURS
        value: "6"
      - key: PIPELINE_API_KEY
        sync: false
      - key: CORS_ORIGINS
        value: https://problemlens.onrender.com,http://localhost:5173
      - key: GEMINI_MODEL
        value: gemini-2.0-flash
      - key: LOG_LEVEL
        value: INFO

  - type: web
    name: problemlens
    runtime: static
    rootDir: app
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    headers:
      - path: /*
        name: X-Frame-Options
        value: DENY
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_API_BASE_URL
        value: https://problemlens-api.onrender.com/api
```

---

## 7. .gitignore Updates

Update the root `.gitignore` to cover Docker and deployment artifacts:

**`.gitignore`** — update:

```
# === Python ===
backend/.venv/
backend/.env
backend/logs/
backend/runs/
backend/store/*.db
backend/store/*.db-*
__pycache__/
*.py[cod]
.pytest_cache/
backend/.pytest_tmp/

# === Frontend ===
app/node_modules/
app/dist/
app/.env

# === Docker ===
*.log
docker-compose.override.yml

# === IDE ===
.vscode/
.idea/
*.swp
*.swo

# === OS ===
.DS_Store
Thumbs.db
```

---

## 8. README — Deployment Documentation

**`README.md`** — new file at project root (replaces any existing):

```markdown
# ProblemLens 🔍

> Discover real-world problems worth solving — curated for builders and founders.

ProblemLens is an AI-powered problem intelligence platform that discovers,
classifies, scores, and presents real-world problems as actionable startup
opportunities.

## Quick Start (Local)

### Prerequisites
- Python 3.13+
- Node.js 20+
- Docker (optional, for containerized setup)

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/ProblemLens.git
cd ProblemLens

# 2. Create root .env
echo "GEMINI_API_KEY=your-key-here" > .env

# 3. Start everything
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Health check: http://localhost:8000/api/health

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env         # Edit with your API keys
python -m uvicorn api.main:app --reload
```

**Frontend:**
```bash
cd app
npm install
npm run dev
```

## Architecture

```
ProblemLens/
├── backend/          # FastAPI + AI Pipeline
│   ├── agents/       # Discovery, extraction, classification agents
│   ├── api/          # REST API routes, middleware, rate limiting
│   ├── models/       # Pydantic schemas and enums
│   ├── providers/    # Gemini + OpenAI LLM providers
│   ├── store/        # SQLite card store
│   └── Dockerfile
├── app/              # React + Vite frontend
│   ├── src/app/      # Components, contexts, services
│   └── Dockerfile
├── specs/            # All phase specifications
├── docker-compose.yml
├── render.yaml       # Render deployment config
└── .github/workflows/ci.yml
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check with DB/scheduler status | — |
| GET | `/api/problems` | List all problems (filterable) | — |
| GET | `/api/problems/{id}` | Get single problem card | — |
| GET | `/api/stats` | Analytics summary | — |
| GET | `/api/pipeline/runs` | Recent pipeline activity | — |
| GET | `/api/pipeline/stats` | Pipeline statistics | — |
| POST | `/api/pipeline/run` | Trigger discovery pipeline | `X-API-Key` |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `PRIMARY_PROVIDER` | No | `gemini` | LLM provider |
| `ENABLE_SCHEDULER` | No | `false` | Auto-run discovery on schedule |
| `PIPELINE_API_KEY` | No | `""` | API key for pipeline trigger (empty = open) |
| `CORS_ORIGINS` | No | `localhost` | Comma-separated allowed origins |
| `VITE_API_BASE_URL` | No | `http://localhost:8000/api` | Backend URL for frontend |

## Testing

```bash
# Backend
cd backend
python -m pytest

# Frontend
cd app
npm run build
```

## Deployment

Deployed on [Render](https://render.com):
- **API:** https://problemlens-api.onrender.com
- **App:** https://problemlens.onrender.com

See `render.yaml` for infrastructure-as-code configuration.

## License

MIT
```

---

## 9. File Deliverables

| File | Action |
|------|--------|
| `backend/Dockerfile` | **Create** — multi-stage Python build |
| `backend/.dockerignore` | **Create** — exclude venv, tests, .env |
| `app/Dockerfile` | **Create** — multi-stage Node build with serve |
| `app/.dockerignore` | **Create** — exclude node_modules, dist |
| `docker-compose.yml` | **Create** — orchestrate backend + frontend |
| `.github/workflows/ci.yml` | **Create** — backend tests + frontend build + docker check |
| `render.yaml` | **Create** — Render infrastructure-as-code |
| `.gitignore` | **Update** — add Docker, IDE, OS patterns |
| `README.md` | **Create/Update** — comprehensive project documentation |

---

## 10. Testing Strategy

### 10.1 Docker Build Verification

```bash
# Build both images
docker compose build

# Start and verify
docker compose up -d

# Check health
curl http://localhost:8000/api/health

# Check frontend
curl -I http://localhost:3000

# View logs
docker compose logs -f

# Tear down
docker compose down
```

### 10.2 CI Verification

Push to a branch, open a PR, and verify that all three jobs pass:
1. ✅ Backend Tests — all pytest tests pass
2. ✅ Frontend Build — `npm ci && npm run build` succeeds
3. ✅ Docker Build Check — both images build without errors

### 10.3 Render Deployment Verification

After connecting the GitHub repo to Render:

1. Backend deploys as a Docker web service
2. `/api/health` returns `{"status": "ok", "checks": {...}}`
3. Frontend deploys as a static site
4. `https://problemlens.onrender.com` loads the app
5. App successfully fetches data from `https://problemlens-api.onrender.com/api`
6. CORS headers allow the frontend origin

---

## 11. Exit Conditions

- [ ] `docker compose up --build` starts both services locally
- [ ] `curl http://localhost:8000/api/health` returns `{"status": "ok"}`
- [ ] `curl http://localhost:3000` returns the SPA HTML
- [ ] Backend image builds cleanly with `docker build ./backend`
- [ ] Frontend image builds cleanly with `docker build ./app`
- [ ] `.github/workflows/ci.yml` passes all three jobs on push
- [ ] `render.yaml` defines both services
- [ ] `README.md` documents setup, API, env vars, and deployment
- [ ] `.gitignore` covers Docker artifacts, IDE files, and OS files
- [ ] No secrets are baked into any Docker image
- [ ] Backend health check works in Docker (HEALTHCHECK instruction)
- [ ] Frontend can reach backend via `VITE_API_BASE_URL` environment variable

---

## 12. What This Doesn't Include (Post-Launch)

| Item | Reason |
|------|--------|
| Redis-backed rate limiting | Not needed until multi-instance scaling |
| JWT/OAuth user auth | No user accounts in v1 |
| CDN for API responses | Render's free tier is sufficient for launch |
| Kubernetes | Massive overkill for a single-server app |
| Terraform | `render.yaml` is sufficient for this scale |
| Monitoring (Datadog, Sentry) | Can add post-launch when there's real traffic |
| Database migration tool (Alembic) | SQLite with auto-schema; not needed until PostgreSQL migration |
