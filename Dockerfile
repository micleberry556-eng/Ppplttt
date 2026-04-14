# ============================================================================
# Konoha — Multi-stage Docker build
# Stage 1: Build admin panel (Node.js)
# Stage 2: Run Konoha bus (Bun)
# ============================================================================

# --- Stage 1: Build admin panel ---
FROM node:22-slim AS admin-build
WORKDIR /build/admin
COPY admin/package.json admin/package-lock.json* ./
RUN npm ci --ignore-scripts
COPY admin/ ./
RUN npm run build

# --- Stage 2: Runtime ---
FROM oven/bun:1 AS runtime
WORKDIR /app

# Install system deps
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy application code
COPY package.json bun.lock* ./
RUN bun install --production

COPY src/ ./src/

# Copy built admin panel
COPY --from=admin-build /build/admin/dist ./admin/dist

# Create shared directories
RUN mkdir -p /opt/shared/attachments

# Environment
ENV KONOHA_PORT=3200
ENV KONOHA_TOKEN=change-me-on-first-run

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3200/health || exit 1

CMD ["bun", "run", "src/server.ts"]
