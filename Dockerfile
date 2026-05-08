# ── Red Portal — Dockerfile ───────────────────────────────────────────────────
# Multi-stage build:
#   Stage 1 (builder) — installs deps, runs postinstall (copy-uv), builds Vite site
#   Stage 2 (runner)  — lean production image, only what's needed to run the server

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker can cache the install layer
COPY package*.json ./
COPY copy-uv.js    ./

# Install all deps (including devDeps for Vite).
# postinstall runs automatically → copy-uv.js → public/uv/
RUN npm install

# Copy the rest of the source and build
COPY . .
RUN npm run build

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy manifests and install production deps only (no Vite, no UV package needed)
COPY package*.json ./
COPY copy-uv.js    ./
RUN npm install --omit=dev

# Copy the built site and server from the builder stage
COPY --from=builder /app/dist ./dist
COPY server.js ./

EXPOSE 8080

CMD ["node", "server.js"]
