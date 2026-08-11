# OPS-001 — Public Arena Deployment and Readiness Foundation

Owner: `Product Architect`

Track: `Public Arena Alpha launch track`

Risk: `HIGH — production runtime, container, endpoint, and shutdown behavior`

Merge authority: `Human only`

## Baseline and program authority

- NET-001 / PR #56 is human-merged at
  `87ea2a5abe77c3548cded6347d0650c31e8bd72c`.
- The Wave 1 authority/security foundation required for Public Arena Alpha is
  complete at this baseline.
- The canonical campaign roadmap remains unchanged; Public Arena Alpha does
  not imply campaign-MVP completion.
- Accepted decision records remain exactly 35. OPS-001 creates no accepted
  decision.

## Deployment topology

The bounded staging topology is one non-persistent, in-memory,
server-authoritative server process and one static-client container. TLS and
the public reverse proxy remain external. Both containers bind host loopback
ports for that proxy; the internal Node port is not directly public. Many
`battle` room instances may exist inside the one server process.

Multiple replicas, horizontal scaling, sticky sessions, distributed rooms,
Redis presence, databases, migrations, persistence, and cross-process room
discovery are forbidden.

## Runtime and client configuration

- Production Origin and rate-limit behavior from SEC-007 remains unchanged.
- Reconnect ownership and grace behavior from NET-001 remains unchanged.
- `VITE_BURNINGSPACE_SERVER_URL` is the canonical client server origin. A
  production build requires an exact absolute HTTP/HTTPS origin and fails on
  credentials, paths, query, fragment, unsupported schemes, or absence.
- Development defaults to `http://127.0.0.1:2567`; explicit malformed values
  fail in every mode.
- `BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS` defaults to 15 and accepts integers
  from 1 through 60 only.

## Health, readiness, logs, and shutdown

`GET /health` preserves its existing 200 response. `GET /ready` is 200 only
after configuration, security, transport, and listening succeed, and is 503
before readiness or during drain. Neither endpoint reveals sensitive or
gameplay state.

Lifecycle events are one-line JSON for starting, ready, shutdown start,
shutdown completion, startup failure, and shutdown failure. They include only
safe operational fields. SIGTERM/SIGINT are deduplicated; readiness changes
before Colyseus graceful shutdown, HTTP/WebSockets close within a configured
bound, normal signal shutdown exits 0, and timeout exits nonzero.

## Containers, Compose, smoke, and runbook

- `deploy/server.Dockerfile` builds compiled workspaces and runs the production
  server as non-root on Node 22.
- `deploy/client.Dockerfile` builds with the required public server origin and
  serves static assets only through non-root Nginx with SPA and cache policy.
- `deploy/docker-compose.staging.yml` defines one loopback-bound server and one
  loopback-bound client with no persistent volume or privileged capability.
- `apps/server/scripts/public-arena-smoke.ts` validates health/readiness,
  optional hostile-Origin rejection, a real allowed-Origin join/profile, owned
  ship replication, authoritative movement, and intentional cleanup.
- `docs/ops/public-arena-staging-runbook.md` owns repeatable staging operations
  and the external reverse-proxy boundary.

## Exact scope

Authorized paths are the runtime lifecycle and server entrypoint, canonical
client runtime config and its one existing endpoint owner, Vite build-time
validation, the three focused test files, smoke script, deployment artifacts,
bounded Core workflow, runbook, this task, its review artifact, and CURRENT.
No package manifest, lockfile, decision, roadmap, governance, shared/protocol,
balance/config, room/gameplay, schema, or reconnect implementation path changes.

## Explicit non-goals

No external deployment, credentials, TLS certificates, proxy container,
persistence, accounts, durable identity, campaign systems, gameplay change,
authority change, reconnect change, database, Kubernetes, external
observability, administrative system, scaling, or automated merge.

## Validation

Required evidence: full tests with zero skipped; three lifecycle/readiness
runs; production client build failure without its URL; production build with a
placeholder URL; workspace typecheck/build; protocol-profile check; all three
existing diagnostics; Compose config; both container builds; health,
readiness, static-client, hostile/allowed smoke, and clean SIGTERM container
exit; diff/scope/secret checks. If Docker is unavailable locally, Linux Core
CI owns the container evidence.

## Reviewer routing and merge gate

Required is one independent integrated Operations/Security reviewer covering
the Security and QA triggers plus the Architecture and Network recommendations:
environment and secret safety, endpoint/Origin preservation, readiness,
signals, Colyseus shutdown, non-root image contents, loopback exposure,
reverse-proxy boundary, Compose cleanup, smoke validity, CI, and runbook.
Mandatory substantive Claude QA and Product Architect approval follow on the
reviewed head.

Gameplay review is skipped because no gameplay rule, balance value, room
behavior, schema, movement, combat, death, or respawn path changes. Visual
review is skipped because no UI, layout, asset, VFX, loader, or presentation
behavior changes.

One evidence commit may follow external verdicts. Final-head Core checks must
pass. No agent may merge or externally deploy.

## Next bounded task after merge

UX-001 — Public Arena Connection, Error, and Reconnect UX. It is not active.
