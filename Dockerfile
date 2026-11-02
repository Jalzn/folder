FROM node:26.12.1-trixie-slim AS base
RUN npm install --global pnpm@11.22.0
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile && pnpm build

FROM base AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3370 WEB_DIR=/app/src/web/dist DATABASE_PATH=/data/tinyfold.sqlite BACKUP_DIR=/backups COOKIE_SECURE=true
COPY --from=build /app /app
COPY --chmod=755 infra/docker-entrypoint.sh /usr/local/bin/tinyfold-entrypoint
RUN mkdir -p /data /backups && chown node:node /data /backups
EXPOSE 3370
ENTRYPOINT ["tinyfold-entrypoint"]
CMD ["node", "--import", "tsx", "src/server/main.ts"]
