# Build stage
ARG FLY_REGISTRY
FROM ${FLY_REGISTRY}/docker/node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Keep prisma for db push at runtime
# RUN npm prune --omit=dev

# Production stage — use Debian slim for Prisma compatibility on arm64
ARG FLY_REGISTRY
FROM ${FLY_REGISTRY}/docker/node:20-slim AS production

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Copy pruned node_modules from builder (production deps only + Prisma client)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nodejs

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application with schema sync
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/app.js"]
