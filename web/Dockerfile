# Build stage
ARG FLY_REGISTRY
FROM ${FLY_REGISTRY}/docker/node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# API_URL injected at runtime via next.config.js rewrites — not baked in at build.
# Client code uses relative /api/* paths; the rewrite proxies to the real backend per env.
RUN npm run build
RUN npm prune --omit=dev

# Production stage — Debian slim for ARM64 compatibility
ARG FLY_REGISTRY
FROM ${FLY_REGISTRY}/docker/node:20-slim AS production

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs
USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "start"]
