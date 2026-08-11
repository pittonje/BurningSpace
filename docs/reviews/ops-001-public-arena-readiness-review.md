# OPS-001 — Public Arena Deployment and Readiness Review

## Metadata

- Status: `REVIEW COMPLETE`
- Task: `OPS-001 — Public Arena Deployment and Readiness Foundation`
- Branch: `game/ops-001-public-arena-readiness`
- Base: `87ea2a5abe77c3548cded6347d0650c31e8bd72c`
- Reviewed commit: `ab74ea9fde13061ba68667e28c4f78b271b45bd8`
- Pull request: `#57`

## Scope

- The full PR contains 21 changed paths at the reviewed implementation head.
- The repair commit changed exactly the two authorized files
  `deploy/nginx.conf` and `.github/workflows/pr-checks.yml`.
- There are no dependency, manifest, lockfile, shared/protocol, gameplay,
  schema, reconnect, accepted-decision, roadmap, or external-deployment
  changes from the repair. No unexpected scope remains.

## Deployment topology

Approved topology is one in-memory server process/container and one
static-client container with loopback-only host bindings behind an external
TLS/reverse proxy. There is no persistence, account system, database, or
horizontal scaling. Restarting the server resets active rooms. No external
deployment was performed.

## Server runtime configuration

Production configuration fails closed. Required production Origin and
shutdown settings are validated before readiness, and invalid configuration
causes startup failure rather than a permissive fallback.

## Client endpoint configuration

`VITE_BURNINGSPACE_SERVER_URL` is the canonical client endpoint and is
required for production builds. It must be an exact absolute HTTP/HTTPS
origin; missing or malformed production configuration is rejected.

## Health and readiness

`/health` preserves its liveness response. `/ready` becomes successful only
after configuration, security, transport, and listening complete, and returns
unready before startup or during drain.

## Graceful shutdown

SIGTERM and SIGINT are deduplicated, readiness becomes false before drain,
and shutdown is bounded. Normal signal shutdown exits `0`; timeout or failure
exits nonzero.

## Structured logging

Lifecycle logs are bounded one-line JSON records for startup, readiness,
shutdown, and failure paths. Reviewed fields are operationally useful and do
not leak secrets.

## Server container

The multi-stage server image runs the compiled production server as a non-root
user. Its exec-form process preserves direct signal delivery.

## Client container

The client image builds with the required public server origin and serves only
static content through non-root Nginx on port 8080.

## Compose contract

Compose defines one server and one client with loopback-only host exposure. It
uses no privileged mode, host network, Docker socket, persistent volume, or
horizontal replica topology.

## Reverse-proxy boundary

TLS and the public reverse proxy remain external. The proxy must preserve the
original `Origin` header and WebSocket upgrade semantics; WebSocket Origin
verification remains the final independent upgrade gate.

## Smoke test

The arena smoke validates health/readiness, hostile-Origin rejection, an
allowed join and profile, replicated authoritative ship state, authoritative
movement, and intentional client cleanup.

## CI container validation

Corrected-head Core run `31507791376` completed successfully on
`ab74ea9fde13061ba68667e28c4f78b271b45bd8`. It built and exercised the real
server/client containers and preserved arena smoke, lifecycle, and clean
shutdown checks.

### Cache-policy repair (OPS-001-F1)

- Original finding: `OPS-001-F1 — MEDIUM`
- Original reviewed head: `b4cffcb6ec0ca58886355e3c54af3d1c788a4081`
- Repair commit: `ab74ea9fde13061ba68667e28c4f78b271b45bd8`
- Final disposition: `CLOSED`

Core run `31507791376` observed:

- `/assets/index-F8wCwjGA.js` — `public, max-age=31536000, immutable`
- `/assets/space-background.jpg` — `public, max-age=0, must-revalidate`
- `/index.html` — `no-store` present; combined value
  `no-cache, no-cache, no-store, must-revalidate`
- `/assets/ops-001-cache-policy-missing.txt` — status `404`, with
  `Cache-Control` absent

Stable-name art can no longer receive immutable one-year caching, restoring
safe redeploy and rollback behavior when stable asset contents change.

## Security preservation

SEC-007 Origin/CORS/WebSocket and rate-limit behavior is unchanged. NET-001
reconnect ownership and grace behavior is unchanged. WebSocket Origin
verification remains the final independent upgrade gate, server-authoritative
gameplay is preserved, and no protocol or schema change occurred.

## Runtime regression

Independently run local evidence passed: full tests (`152/152`), typecheck,
valid production build, expected rejection of a missing production URL,
protocol compatibility, network-client diagnostic, movement diagnostic,
combat diagnostic, three consecutive lifecycle/readiness focused runs, and
`git diff --check`.

Docker was unavailable locally to the reviewers, so Linux Core owned container
evidence. Corrected-head Core run `31507791376` succeeded with the real
containers and cache-policy matrix.

## Documentation and runbook

The staging runbook records the bounded topology, environment preparation,
build/start/verify/stop/rollback operations, reverse-proxy requirements, and
the explicit no-external-deployment boundary.

## Blocking findings

No blocking findings remain. Original `OPS-001-F1` was corrected by
`ab74ea9fde13061ba68667e28c4f78b271b45bd8` and is closed.

## Non-blocking notes

- Original full-review LOW findings remain deferred: F2 shutdown-timeout
  automated-coverage gap; F3 Colyseus shutdown dependency comment; F4 PM2
  filter rationale comment; F5 hostile-Origin smoke error-shape strengthening;
  and F6 container-log capture on later CI failure.
- Original F7–F13 remain deferred NOTEs.
- Focused re-review LOW: separately curling the CSS entry and a
  fingerprint-shaped missing asset would be optional coverage strengthening.
- Focused re-review NOTE: duplicate `index.html` `no-cache` values are
  redundant but freshness-consistent and not contradictory.

These observations are non-blocking and are not required before merge.

## Integrated Operations/Security Reviewer

- Verdict: `APPROVE`
- Reviewed commit: `ab74ea9fde13061ba68667e28c4f78b271b45bd8`
- Evidence source: Independent full integrated review of `b4cffcb` followed by
  focused corrected-head rebound review of `ab74ea9`; OPS-001-F1 confirmed
  closed. The first review requested changes solely for OPS-001-F1.
- Date: `2026-08-11`

## Product Architect

- Verdict: `APPROVE`
- Reviewed commit: `ab74ea9fde13061ba68667e28c4f78b271b45bd8`
- Evidence source: Product Architect disposition accepting the focused review,
  closing OPS-001-F1, deferring LOW/NOTE findings, and granting the explicit
  Claude QA infrastructure override.
- Date: `2026-08-11`

## Claude QA

- Verdict: `Approved with suggestions`
- Reviewed commit: `ab74ea9fde13061ba68667e28c4f78b271b45bd8`
- Evidence source: Claude QA run `31507791365` and the published substantive PR
  review.
- Check conclusion: `FAILURE — execution_file_invalid` in a downstream
  diagnostic/telemetry step after substantive execution, validation,
  rendering, and publication succeeded.
- Blockers: None.
- Product Architect disposition: Category-C infrastructure failure; explicit
  PA infrastructure override approved; manual rerun not required.
- Date: `2026-08-11`

## Human merge gate

Implementation review and Product Architect approval are complete. Mandatory
substantive Claude QA is satisfied by its blocker-free verdict plus the
explicit Product Architect infrastructure override. This documentation change
is the one authorized later evidence commit. Final-head Core must pass after
the commit, only a human may merge, and no external deployment is authorized.
