# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/balance/package.json ./packages/balance/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/protocol/package.json ./packages/protocol/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm run build -w @burningspace/shared \
    && npm run build -w @burningspace/protocol \
    && npm run build -w @burningspace/server \
    && npm run build:operator -w @burningspace/server

FROM node:22-bookworm-slim AS runtime-deps
ENV NODE_ENV=production \
    PORT=2567
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/balance/package.json ./packages/balance/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/protocol/package.json ./packages/protocol/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci --omit=dev --workspace @burningspace/server --include-workspace-root=false \
    && npm cache clean --force

FROM runtime-deps AS runtime-base
COPY --from=build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=node:node /app/apps/server/db/migrations ./apps/server/db/migrations
COPY --from=build --chown=node:node /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist

USER node
EXPOSE 2567
STOPSIGNAL SIGTERM
CMD ["node", "apps/server/dist/index.js"]

# Separate one-shot operator image. The final default target stays runtime.
FROM runtime-deps AS persistence-tools
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && mkdir -p /usr/share/postgresql-common/pgdg \
    && curl --fail --silent --show-error https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main' > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-17 \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/ops ./ops
COPY --from=build --chown=node:node /app/apps/server/package.json ./ops/apps/server/package.json
COPY --from=build --chown=node:node /app/apps/server/db/migrations ./ops/apps/server/db/migrations
COPY --chown=node:node deploy/postgres/apply-runtime-grants.sql ./deploy/postgres/apply-runtime-grants.sql
ARG BURNINGSPACE_TOOLS_COMMIT
ENV BURNINGSPACE_TOOLS_COMMIT=${BURNINGSPACE_TOOLS_COMMIT}
USER node
ENTRYPOINT ["node", "/app/ops/apps/server/scripts/persistence-operator.js"]
CMD ["status"]

FROM runtime-base AS runtime
