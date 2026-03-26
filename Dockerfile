# ── Decern Self-Hosted ──
# Multi-stage build: compiles with cloud layer, ships only production artifacts.
# Source code is NOT present in the final image.
#
# Build (Decern CI only — requires access to cloud/):
#   docker build --build-arg NPM_TOKEN=... -t ghcr.io/decernhq/decern:latest .
#
# Run:
#   docker run -p 3000:3000 --env-file .env ghcr.io/decernhq/decern:latest

# ── Stage 1: dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* .npmrc* ./

# If @decernhq/cloud is on GitHub Packages, NPM_TOKEN is needed at install time
ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}

RUN npm ci --ignore-scripts

# ── Stage 2: build ──
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env: enable self-hosted mode
ENV NEXT_PUBLIC_SELF_HOSTED=true

# Prebuild (generates cloud API proxy routes) + Next.js standalone build
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
RUN npm run build

# ── Stage 3: production ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy ONLY production artifacts — no source code
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Entrypoint for runtime checks
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
