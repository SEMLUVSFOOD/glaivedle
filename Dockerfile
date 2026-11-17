# syntax=docker/dockerfile:1.7
# glaivedle — production image (Next.js standalone + SQLite)

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat && npm install -g pnpm@12.18.0 && npm cache clean --force
ENV NEXT_TELEMETRY_DISABLED=1

# ── dependencies ──────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# build tools only needed if no prebuilt better-sqlite3 binary matches the platform
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Coolify passes SOURCE_COMMIT when "Include Source Commit in Build" is enabled
ARG SOURCE_COMMIT=""
ARG PUBLIC_URL="https://glaivedle.lol"
ARG ADOBE_FONTS_KIT=""
ENV SOURCE_COMMIT=$SOURCE_COMMIT \
    PUBLIC_URL=$PUBLIC_URL \
    ADOBE_FONTS_KIT=$ADOBE_FONTS_KIT
RUN pnpm build

# ── runtime ───────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/glaivedle.db

RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app \
    && mkdir -p /data && chown app:app /data

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER app
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
