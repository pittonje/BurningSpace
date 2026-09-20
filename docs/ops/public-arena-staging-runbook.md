# Public Arena Staging Runbook

## Scope and limitations

The deployed OPS-002/v2 Public Arena remains non-persistent. The repository now
contains durable identity/world persistence and needs a database for the current
runtime. It is not campaign MVP or a horizontal-scaling deployment. Current
local builds must use the CI integration overlay; base-only startup of the new
server is incomplete. The [v3 persistent rollout sequence](persist-002-staging-db-integration-plan.md#future-operator-sequence--v3-persistent-profile)
owns future real deployment, private inputs and stop-and-preserve recovery.
Public persistence rollout is BLOCKED; deployment is NOT AUTHORIZED.

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

## Historical v2 local lifecycle

The commands below describe the old in-memory runtime. Do not run this base-only
sequence against the current persistent server. The executable current CI recipe
in .github/workflows/pr-checks.yml combines base + build + integration overlays,
uses disposable PostgreSQL, explicit migration/grants/bootstrap/privilege checks,
then readiness/smoke and disposal of that CI project's volumes. Real staging
must instead use base + DB (+ tools for one-shots), never the CI build/integration
overlays or their test credentials.

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

The legacy v2 shared-host path uses only `deploy/docker-compose.staging.yml`, an
approved real environment inventory, and prebuilt digest-pinned images. It
must never include `docker-compose.staging.build.yml`, a repository checkout,
or `docker compose build`. The complete authorization, preflight, pull/up,
validation, and rollback sequence lives in the
[external staging runbook](public-arena-external-staging-runbook.md).

The following rollback paragraph applies only to the legacy v2 profile. Persistent
v3 recovery stops the candidate and preserves the DB volume/backups/evidence;
switching to an old pre-persistence binary is forbidden as campaign rollback.
Real deployment remains unauthorized until an exact environment-specific GO.
When later authorized, rollback follows the exact mode bound by the external
staging plan: first deployment restores the pre-BurningSpace state; subsequent
deployments switch to recorded previous-approved server/client image digests
without rebuilding. A rollback or restart resets the active arena because
state is in memory.

## Health and readiness

`GET /health` reports that the HTTP process is alive and remains available
while shutdown is draining. `GET /ready` reports 200 only after configuration,
security, transport, persistence initialization, exact schema/world validation,
writer ownership and canonical room initialization are complete. It changes to 503 before
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
- deployed v2 remains non-persistent; repository v3 persists identity/world membership but not a complete campaign;
- no account identity;
- reconnect works only during the current room and process lifetime;
- no campaign state or campaign-MVP claim.

## Incident minimum

1. Check `docker compose ... ps` and the client/server container health.
2. Check `/health`, then `/ready`.
3. Inspect the bounded server/client logs.
4. Stop deployment if the exact Origin policy is wrong.
5. Never recover by setting an Origin wildcard.
6. For a later authorized shared-host deployment, execute the exact rollback
   mode bound by the external staging plan if verification cannot pass.
