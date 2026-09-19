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
- R2: separate compiled tools target, native PostgreSQL 17 utilities, private
  per-operation projections, immutable publication metadata and internal-network
  tools overlay implemented. Restore requires a fresh marked database denied to
  the runtime role; cleanup is explicit and refuses source/unknown targets.
  Real PostgreSQL backup/restore tests pass, including authority, state, count,
  constraint and target negatives. Disposable immutable-container test passes
  migration/status/grants/bootstrap/three role checks/backup/restore/cleanup and
  output secret-canary checks. Workspace build/typecheck and both script configs
  pass. V2 56 self-tests and v3 18 focused cases pass; full rendered v3 runtime +
  tools model passes. Classifier and QA-routing audits pass.
  Additional packaging fix: SQL checkout uses LF so its bytes match the canonical
  migration checksum on Windows and Linux; the SQL Git blob is unchanged.
- R3: bounded A/B/spoof and separate host-local proof phases implemented, with
  strict evidence correlation to final-container socket observation and fixed
  edge-proof log reasons. Fresh-auth evidence is explicitly INCONCLUSIVE.
  Guest diagnostic sends only `{}` and creates zero durable rows. Real server +
  PostgreSQL admission suite: 31 tests pass using Vitest threads on this Windows
  Node 24 host (default fork run encountered an IPC channel failure).
  Evidence unit cases: 3 pass; POSIX credential test is skipped on Windows and
  exclusive 0600 creation/read/overwrite refusal was separately verified in a
  Linux container. CI runs the POSIX test normally. External smoke self-tests:
  3 pass; external script typecheck passes. Credential provisioning creates the
  private file before the single issuance request and never prints credentials.
- R4: pending.
