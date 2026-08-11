# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
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
COPY apps/client ./apps/client
COPY packages ./packages

ARG VITE_BURNINGSPACE_SERVER_URL
ENV VITE_BURNINGSPACE_SERVER_URL=${VITE_BURNINGSPACE_SERVER_URL}
RUN test -n "$VITE_BURNINGSPACE_SERVER_URL" \
    || (echo "VITE_BURNINGSPACE_SERVER_URL is required for production client builds." >&2; exit 1)
RUN npm run build -w @burningspace/shared \
    && npm run build -w @burningspace/protocol \
    && npm run build -w @burningspace/client

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=nginx:nginx /app/apps/client/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
