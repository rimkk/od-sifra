# Build stage
ARG FLY_REGISTRY
FROM ${FLY_REGISTRY}/docker/node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=https://api.odsifra.com/api

COPY package*.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
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
