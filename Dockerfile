FROM node:26.12.1-trixie-slim AS base
RUN npm install --global pnpm@11.22.0
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3370 WEB_DIR=/app/src/web/dist DATABASE_PATH=/data/tinyfold.sqlite BACKUP_DIR=/backups COOKIE_SECURE=true
COPY --from=build /app /app
RUN mkdir -p /data /backups && chown node:node /data /backups
USER node
EXPOSE 3370
CMD ["node", "--import", "tsx", "src/server/main.ts"]
