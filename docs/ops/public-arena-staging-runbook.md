# Public Arena Staging Runbook

## Scope and limitations

This runbook operates the Public Arena Alpha only. The deployment is one
server process with an in-memory world and one static client. It has no
persistence, accounts, durable identity, campaign systems, or horizontal
scaling. Restarting the server resets every active room and its world state.
This is not the campaign MVP.

## Required infrastructure

- Linux VPS with Docker Engine and the Docker Compose plugin;
- DNS names for the public client and server origins;
- a TLS reverse proxy installed outside this Compose project;
- access to approved digest-pinned images for any real shared-host deployment.

## Required environment

Copy the placeholder file to the Git-ignored deployment environment file and
replace every example value with the staging values:

```sh
cp deploy/staging.env.example deploy/.env.staging
```

`deploy/staging.env.example` and its mutable local image tags are only for the
local/CI build override. A real shared-host inventory instead starts from
`deploy/external-staging.env.example`, supplies four approved immutable target
and previous image references, and passes the external staging preflight.

`BURNINGSPACE_ALLOWED_ORIGINS` is the exact comma-separated browser-origin
allowlist. `VITE_BURNINGSPACE_SERVER_URL` is the public HTTPS server origin
embedded into the client build. The reconnect, shutdown, profile-rate, and
input-rate variables configure their existing bounded runtime policies. The
two bind-port variables select loopback host ports. `NODE_ENV` remains
`production`; Compose sets the server's internal `PORT=2567`.

Do not put credentials, tokens, certificates, SSH material, or private server
addresses in the example file or repository.

## Build and local validation

```sh
docker compose --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml -f deploy/docker-compose.staging.build.yml config
docker compose --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml -f deploy/docker-compose.staging.build.yml build
docker compose --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml -f deploy/docker-compose.staging.build.yml up -d
curl --fail http://127.0.0.1:2567/health
curl --fail http://127.0.0.1:2567/ready
curl --fail http://127.0.0.1:8080/
set -a
. deploy/.env.staging
set +a
BURNINGSPACE_SMOKE_SERVER_URL=http://127.0.0.1:${BURNINGSPACE_SERVER_BIND_PORT:-2567} \
  BURNINGSPACE_SMOKE_ORIGIN="$BURNINGSPACE_ALLOWED_ORIGINS" \
  npx tsx apps/server/scripts/public-arena-smoke.ts
docker compose --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml -f deploy/docker-compose.staging.build.yml stop
docker compose --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml -f deploy/docker-compose.staging.build.yml down --remove-orphans
```

If the allowlist contains more than one origin, set
`BURNINGSPACE_SMOKE_ORIGIN` to one exact allowed origin instead of the whole
list. Add `BURNINGSPACE_SMOKE_HOSTILE_ORIGIN=https://hostile.example.invalid`
to exercise denial before the allowed path.

## Reverse proxy requirements

Terminate TLS at the host reverse proxy. Route the client hostname to the
loopback client port and the server hostname to the loopback server port. The
server route must use HTTP/1.1 upstream, preserve `Host` and the browser's
original `Origin`, forward `Upgrade` and `Connection` for WebSockets, and use
a timeout suitable for long-lived WebSockets. Forwarded client IPs are for
operations logs only and are never identity or gameplay authority.

Do not expose the Node port publicly, rewrite Origin, proxy gameplay through
the client container, or weaken the exact allowlist to `*`.

## Shared-host deployment boundary

The real shared-host path uses only `deploy/docker-compose.staging.yml`, an
approved real environment inventory, and prebuilt digest-pinned images. It
must never include `docker-compose.staging.build.yml`, a repository checkout,
or `docker compose build`. The complete authorization, preflight, pull/up,
validation, and rollback sequence lives in the
[external staging runbook](public-arena-external-staging-runbook.md).

Real deployment remains unauthorized until an exact environment-specific GO.
When later authorized, rollback switches to the recorded previous-approved
server/client image digests without rebuilding. A rollback or restart resets
the active arena because state is in memory.

## Health and readiness

`GET /health` reports that the HTTP process is alive and remains available
while shutdown is draining. `GET /ready` reports 200 only after configuration,
security, transport, and listening are ready; it changes to 503 before
graceful shutdown. Reverse-proxy routing and deployment verification should use
readiness, while the Compose container healthcheck uses liveness.

## Logs

The server emits one-line JSON lifecycle events: `server_starting`,
`server_ready`, `shutdown_started`, `shutdown_completed`, `startup_failed`,
and `shutdown_failed`. Inspect them with `docker compose ... logs server`.
They intentionally omit Origin lists, headers, reconnect tokens, room state,
and player data.

## Graceful shutdown

Docker sends SIGTERM. The server immediately becomes unready, stops Colyseus
matchmaking/gameplay through its supported graceful-shutdown path, settles
rooms and pending reconnect work, closes HTTP/WebSocket resources, and exits
0. The default bound is 15 seconds; Compose allows 20 seconds before forced
container termination. A timeout emits `shutdown_failed` and exits nonzero.

## Smoke test

```sh
BURNINGSPACE_SMOKE_SERVER_URL=https://arena-api.example.com \
  BURNINGSPACE_SMOKE_ORIGIN=https://arena.example.com \
  npx tsx apps/server/scripts/public-arena-smoke.ts
```

The script checks health/readiness, joins the real `battle` room with an
explicit Origin, configures a normal player, observes its owned ship, proves
authoritative movement, and leaves intentionally. It prints one concise JSON
result and never prints a reconnect token.

## Known limitations

- one server process and no horizontal scaling;
- no persistence; restart resets every active arena;
- no account identity;
- reconnect works only during the current room and process lifetime;
- no campaign state or campaign-MVP claim.

## Incident minimum

1. Check `docker compose ... ps` and the client/server container health.
2. Check `/health`, then `/ready`.
3. Inspect the bounded server/client logs.
4. Stop deployment if the exact Origin policy is wrong.
5. Never recover by setting an Origin wildcard.
6. Roll back to the previous approved commit if verification cannot pass.
