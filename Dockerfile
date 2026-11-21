# syntax=docker/dockerfile:1.7
# One Dockerfile, two targets: `web` (dashboard + API + Telegram webhook) and `worker` (pipeline + rendering).

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# Install dependencies from the lockfile only, then copy the source.
FROM base AS source
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline

FROM source AS web-build
RUN pnpm --filter @content-engine/web build

# Dashboard: Next.js standalone output, runs as the unprivileged node user.
FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=web-build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

# Worker: Inngest functions plus Remotion rendering (headless Chrome needs these libraries and fonts).
FROM source AS worker
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
      libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
      fonts-inter fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*
# Download Remotion's headless Chrome at build time, not on the first render.
RUN cd packages/video && node -e "import('@remotion/renderer').then((r) => r.ensureBrowser())"
RUN chown -R node:node /app
USER node
ENV NODE_ENV=production WORKER_PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@content-engine/worker", "start"]
