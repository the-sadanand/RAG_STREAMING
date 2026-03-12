# ── Frontend Image (multi-stage) ─────────────────────────────────────────────
# Stage 1: build  — node:20-alpine, installs deps and runs vite build
# Stage 2: serve  — nginx:alpine, copies only the /dist output (~5 MB total)
#
# node_modules (~200 MB) is left in stage 1 and never enters the final image.

### Stage 1 — Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Clean install — reproducible, uses lock file if present
RUN npm ci --prefer-offline 2>/dev/null || npm install

# Copy source and build
COPY . .
RUN npm run build

### Stage 2 — Serve ──────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy only the compiled assets from stage 1 (~200 KB of JS/CSS)
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config (WebSocket proxy + SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s \
    CMD wget -q --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
