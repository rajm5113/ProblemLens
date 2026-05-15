# ──────────────────────────────────────
# Stage 1: Build the frontend
# ──────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL is injected at build time
ARG VITE_API_BASE_URL=http://localhost:8000/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ──────────────────────────────────────
# Stage 2: Serve the static build
# ──────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Lightweight SPA-friendly static server
RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

ENV PORT=3000
EXPOSE ${PORT}

# -s flag enables SPA fallback (serves index.html for unknown routes)
CMD ["serve", "-s", "dist", "-l", "3000"]
