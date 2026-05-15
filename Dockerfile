# ── Stage 1: Build frontend + bundle server ──────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite frontend (outputs to dist/) and bundle server.ts (outputs to dist/server.cjs)
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Cloud Run injects PORT — do not hardcode
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
