# ProblemLens 🔍

> **Discover real-world problems worth solving — curated for builders and founders.**

ProblemLens is an AI-powered problem intelligence platform. It automatically discovers pain points from 15+ online sources (Reddit, HackerNews, ProductHunt, Dev.to), runs each signal through a multi-agent **Google Gemini** pipeline, and surfaces the highest-opportunity problems in a sleek, mobile-first dashboard.

Think of it as a **24/7 problem scout** — it finds what people are complaining about and scores each problem on severity, market potential, AI feasibility, and competition so you know *which problems are actually worth building a startup around.*

---

## 🎬 What It Looks Like

| Feed View | Dashboard | Sector Grid |
|-----------|-----------|-------------|
| Swipeable cards with scores | Analytics overview with charts | Icon-based sector navigation |

---

## ⚡ Quick Start

### Option 1: Docker Compose (Easiest — one command)

```bash
# 1. Clone the repo
git clone https://github.com/rajm5113/ProblemLens.git
cd ProblemLens

# 2. Add your Gemini API key
echo "GEMINI_API_KEY=your-key-here" > .env

# 3. Start everything
docker compose up --build
```

That's it! Open your browser:

| What | URL |
|------|-----|
| 🖥️ Frontend | [http://localhost:3000](http://localhost:3000) |
| 🔌 Backend API | [http://localhost:8000/api](http://localhost:8000/api) |
| ❤️ Health check | [http://localhost:8000/api/health](http://localhost:8000/api/health) |

### Option 2: Manual Setup (for development)

**Step 1 — Backend (Python)**

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# Create your config file
cp .env.example .env
# Open .env and paste your Gemini API key
```

Then start the server:

```bash
python -m uvicorn api.main:app --reload --port 8000
```

**Step 2 — Frontend (React)**

```bash
cd app
npm install
npm run dev          # opens http://localhost:5173
```

**Step 3 — Run the Discovery Pipeline (optional)**

```bash
cd backend
python run_pipeline.py full      # Discover + analyze problems
python run_pipeline.py status    # Check how many cards you have
```

---

## 🧠 How It Works

The pipeline has 5 stages that run automatically:

```
  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐    ┌───────────┐
  │  DISCOVER    │───▶│  EXTRACT    │───▶│  CLASSIFY   │───▶│  SCORE    │───▶│  ENRICH   │
  │  Fetch from  │    │  Pull out   │    │  Assign     │    │  Rate     │    │  Generate │
  │  15 sources  │    │  pain point │    │  sector &   │    │  severity │    │  solutions│
  │              │    │  signals    │    │  audience   │    │  market   │    │  & risks  │
  └─────────────┘    └─────────────┘    └─────────────┘    │  AI score │    └───────────┘
                                                           └───────────┘
```

1. **Discover** — Fetches posts from Reddit, HN, ProductHunt, Dev.to (15 endpoints total)
2. **Keyword Gate** — Pre-filters noise with a two-tier keyword system (saves API tokens)
3. **Extract** — Gemini identifies the core pain point from each post
4. **Classify** — Assigns a sector (Healthcare, Fintech, Education, etc.) and target audience
5. **Score** — Rates each problem: Severity, Market Potential, AI Feasibility, Competition
6. **Enrich** — Generates possible solutions, risks, and existing alternatives

The final output is a **Problem Intelligence Card** — a structured, scored dossier on each problem.

---

## 📡 Discovery Sources (15 active)

| Platform | Endpoints | What It Catches |
|----------|-----------|----------------|
| **Reddit** (9 subs) | r/india, r/IndianStartups, r/developersIndia, r/LegalAdviceIndia, r/IndiaInvestments, r/bangalore, r/SideProject, r/Entrepreneur, r/startups | Real user complaints, startup ideas, market gaps |
| **Hacker News** | Top stories | Tech-forward problems, developer pain points |
| **Product Hunt** | Product feed | Solutions that exist (what's missing?) |
| **Dev.to** (4 tags) | #startup, #saas, #india, #productivity | Builder perspectives, SaaS problems |

---

## 🏗 Project Structure

```
ProblemLens/
├── backend/                    # Python API + AI pipeline
│   ├── agents/                 # Discovery, extraction, classification, scoring agents
│   │   └── fetchers/           # Per-source HTTP fetchers (Reddit, HN, ProductHunt, Dev.to)
│   ├── api/                    # FastAPI REST routes + middleware
│   │   ├── middleware.py       # Request logging + security headers
│   │   ├── rate_limit.py       # slowapi rate limiter
│   │   └── routes/             # /problems, /stats, /pipeline
│   ├── models/                 # Pydantic schemas + enums
│   ├── providers/              # Gemini + OpenAI LLM wrappers
│   ├── store/                  # SQLite card + signal storage
│   ├── utils/                  # Keyword filter, helpers
│   ├── prompts/                # LLM prompt templates
│   ├── config.py               # All settings, sources, model config
│   ├── scheduler.py            # Background discovery scheduler
│   ├── run_pipeline.py         # CLI entry point
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile
│
├── app/                        # React frontend (Vite)
│   ├── src/app/
│   │   ├── components/         # Feed, DeepDive, Dashboard, DesktopLayout
│   │   ├── contexts/           # Bookmarks, Notes (localStorage)
│   │   ├── hooks/              # useNewProblemsPoller, useDeepLink
│   │   ├── services/api.ts     # Typed fetch wrappers
│   │   ├── data/problems.ts    # Sector colors, score helpers
│   │   ├── tokens.ts           # Full design system (colors, spacing, fonts)
│   │   └── utils/              # Date formatting, helpers
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml          # Run everything locally with one command
├── render.yaml                 # Render cloud deployment config
├── .github/workflows/ci.yml    # GitHub Actions: tests + build + Docker check
└── README.md                   # You are here
```

---

## 🔌 API Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint | What It Does | Auth? |
|--------|----------|-------------|-------|
| `GET` | `/health` | Check if the server is running | No |
| `GET` | `/problems` | List all problem cards (filterable) | No |
| `GET` | `/problems/{id}` | Get one card by ID (e.g., `PIP-001`) | No |
| `GET` | `/stats` | Analytics: sector breakdown, score distribution | No |
| `GET` | `/pipeline/runs` | Recent pipeline activity feed | No |
| `GET` | `/pipeline/stats` | Pipeline run statistics | No |
| `POST` | `/pipeline/run` | Manually trigger a discovery cycle | Yes (`X-API-Key` header) |

**Rate limits:** 60 req/min for reads, 30 req/min for stats, 2 req/hour for pipeline triggers.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required? | Default | What It Does |
|----------|-----------|---------|-------------|
| `GEMINI_API_KEY` | **Yes** | — | Your Google Gemini API key ([get one free](https://aistudio.google.com/apikey)) |
| `OPENAI_API_KEY` | No | — | Optional fallback if Gemini is down |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Primary Gemini model for analysis |
| `GEMINI_FALLBACK_MODEL` | No | `gemini-3.1-flash-lite` | High-throughput fallback model |
| `PRIMARY_PROVIDER` | No | `gemini` | Which LLM provider to use first |
| `ENABLE_SCHEDULER` | No | `false` | Auto-run discovery on a timer |
| `DISCOVERY_INTERVAL_HOURS` | No | `6` | Hours between scheduled discovery runs |
| `PIPELINE_API_KEY` | No | `""` | Protects `POST /pipeline/run`. Empty = open (dev mode) |
| `CORS_ORIGINS` | No | `localhost:*` | Comma-separated allowed frontend URLs |
| `LOG_LEVEL` | No | `INFO` | Python log level (`DEBUG`, `INFO`, `WARNING`) |

### Frontend (`app/.env`)

| Variable | Default | What It Does |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Where the frontend sends API requests |

> **Tip:** Copy `.env.example` → `.env` in both `backend/` and `app/` to get started.

---

## 🧪 Testing

```bash
# Backend — run all tests
cd backend
python -m pytest --tb=short -q

# Frontend — validate production build
cd app
npm run build
```

CI runs automatically on every push via GitHub Actions (`.github/workflows/ci.yml`):
- ✅ Backend pytest suite
- ✅ Frontend Vite build check
- ✅ Docker image build verification

---

## 🚀 Deployment

### Render (recommended — free tier)

The repo includes a `render.yaml` blueprint for one-click deployment:

1. Fork this repo on GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New Blueprint**
3. Connect your fork — Render reads `render.yaml` automatically
4. Set your secrets in the Render dashboard:
   - `GEMINI_API_KEY` — your Gemini API key
   - `PIPELINE_API_KEY` — any secret string to protect the pipeline endpoint
5. Push to `main` — Render auto-deploys both frontend and backend

### Vercel + Render (alternative)

| Part | Platform | Why |
|------|----------|-----|
| Frontend | **Vercel** | Free, instant deploys, perfect for Vite/React |
| Backend | **Render** | Free tier supports Docker + background jobs |

Set `VITE_API_BASE_URL` in Vercel to point at your Render backend URL.

---

## 🛠 CLI Commands

The pipeline has a built-in CLI for manual control:

```bash
cd backend

# Run the full discovery → analysis → card creation pipeline
python run_pipeline.py full

# Run discovery only (fetch signals, skip analysis)
python run_pipeline.py discover

# Check your current database health
python run_pipeline.py status
# Output example:
#   Cards:   44
#   Signals: 71
#   Avg opp: 6.8
#     New: 44

# Update trend labels (Rising, Stable, Declining)
python run_pipeline.py trends
```

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI / LLM** | Google Gemini 2.5 Flash (primary), Gemini 3.1 Flash Lite (high-throughput fallback) |
| **Backend** | Python 3.13, FastAPI, uvicorn, slowapi, structlog, Pydantic v2 |
| **Database** | SQLite (via custom card_store — zero config) |
| **Frontend** | React 18, Vite 6, TypeScript, Recharts, Motion (Framer Motion), Lucide Icons |
| **Styling** | Custom design system (tokens.ts) + CSS |
| **Containerization** | Docker (multi-stage builds), Docker Compose |
| **CI/CD** | GitHub Actions |
| **Cloud** | Render (Web Service + Static Site) |

---

## 📄 License

MIT — use it, fork it, build on it. If you find a great problem to solve, go build the solution! 🚀
