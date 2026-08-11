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
    && npm run build -w @burningspace/server

FROM node:22-bookworm-slim AS runtime
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

COPY --from=build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=node:node /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist

USER node
EXPOSE 2567
STOPSIGNAL SIGTERM
CMD ["node", "apps/server/dist/index.js"]
