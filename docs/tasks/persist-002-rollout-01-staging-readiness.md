# PERSIST002-ROLLOUT-01 — Persistent staging rollout readiness

Status: DESIGN PA ACCEPTED / IMPLEMENTATION AUTHORIZED. Public persistence rollout
BLOCKED; deployment NOT AUTHORIZED. NET-02 is MERGED / CLOSED. Public staging
continues to run the earlier non-persistent runtime.

Canonical base: `ac5ddaac7f70f261fe8357e3fa448ef61c7e56ad`.
Branch: `ops/persist002-rollout-01-readiness`.

## Scope and review routing (declared before implementation)

Four sequential packets: R1 strict v3 contract; R2 immutable database operations;
R3 bounded evidence diagnostics; R4 executable operator sequence and current-state
reconciliation. Preserve v2 and the existing readiness, gameplay, SQL migration,
identity protocol, limiter constants and Caddy trust architecture.

Required after implementation: Architecture (deployment/persistence boundaries),
Network (admission attribution/diagnostics), Security (private inputs and database
authority), QA (operations and restore correctness). Gameplay is skipped because
no rules or balance change; Visual is not applicable because no presentation or
assets change. Independent reviewers/agents are not invoked during the packets,
as explicitly required by the implementation authorization. These deferred
reviews remain readiness gates; implementation does not imply approval.

## Frozen decisions

The persistent profile uses schema v3, exact schema/domain version 1, immutable
server/client/tools/PostgreSQL images and recovery `stop-and-preserve`. The old
non-persistent binary is not a compatible persistence rollback. Secrets remain
private role-scoped operator projections; Caddy keeps its approved systemd
credential. Final runtime has three services; tools are bounded one-shots on the
internal DB network. Restore rehearsal uses a fresh non-serving database in the
same PostgreSQL 17 cluster, followed by explicit cleanup. No host DB port, Docker
socket, nested Docker in tools, host development checkout, new public endpoint,
automatic migration or DOWN migration is permitted.

Actual socket-peer measurement, two independent effective admission keys,
invalid-proof log correlation, and all deployed-state evidence remain future
deployment-GO work. Repository tests cannot substitute for live evidence.

## Packet checkpoints

- R1: v3 plan, strict final-runtime model, effective environment and scoped private
  validators implemented. Legacy preflight: 56 self-tests pass; v3 focused suite:
  17 tests pass; external-tool TypeScript and diff checks pass. Compose template
  validation is repeated after the R2 overlay is available. Dependencies installed
  with the existing lockfile; no dependency versions changed.
- R2–R4: pending.
