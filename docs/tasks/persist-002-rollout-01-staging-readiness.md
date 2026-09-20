# PERSIST002-ROLLOUT-01 — Persistent staging rollout readiness

Status: IMPLEMENTATION COMPLETE / REVIEW PENDING (design PA accepted). Public persistence rollout
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
- R4: operator sequence and current-state reconciliation implemented; local
  validation passed. Historical FIX/failed-QA/OPS-002 evidence remains
  intact. Final validation also required updating the existing secret-transport
  fixture to the new marked restore target, enforcing LF for unchanged systemd
  assets, and closing Compose override holes (healthcheck commands, ephemeral
  DB storage, network attachments/options and volume drivers). These are bounded
  corrections within the accepted rollout contract, not runtime/trust changes.

## Commit file inventory

### R1 — 70d9b02

- .github/workflows/pr-checks.yml
- .gitignore
- apps/server/scripts/external-staging-preflight.ts
- apps/server/scripts/persistent-rollout-contract.ts
- apps/server/test/persistence/persistentRolloutContract.test.ts
- deploy/external-staging-persistence-plan.example.json
- deploy/external-staging-persistence.env.example
- deploy/staging.db.env.example
- docs/handoffs/CURRENT.md
- docs/tasks/persist-002-rollout-01-staging-readiness.md

### R2 — b8b4a39

- .dockerignore
- .gitattributes
- .github/workflows/pr-checks.yml
- .github/workflows/publish-staging-images.yml
- .gitignore
- apps/server/package.json
- apps/server/scripts/backup-dump.ts
- apps/server/scripts/backup-restore-verify.ts
- apps/server/scripts/db-privilege-check.ts
- apps/server/scripts/external-staging-preflight.ts
- apps/server/scripts/persistence-operator.ts
- apps/server/scripts/persistence-tooling.ts
- apps/server/scripts/persistent-rollout-contract.ts
- apps/server/scripts/private-operator-input.ts
- apps/server/scripts/restore-target.ts
- apps/server/scripts/tsconfig.operator-build.json
- apps/server/scripts/tsconfig.persistence-tools.json
- apps/server/test/persistence/backupRestore.test.ts
- apps/server/test/persistence/immutablePersistenceTools.test.ts
- apps/server/test/persistence/persistentRolloutContract.test.ts
- deploy/docker-compose.staging.db.yml
- deploy/docker-compose.staging.tools.yml
- deploy/server.Dockerfile
- docs/handoffs/CURRENT.md
- docs/tasks/persist-002-rollout-01-staging-readiness.md

### R3 — 3ce7a96

- .github/workflows/pr-checks.yml
- apps/server/scripts/external-staging-admission-smoke.ts
- apps/server/scripts/external-staging-smoke.ts
- apps/server/scripts/private-smoke-credential.ts
- apps/server/scripts/tsconfig.external-staging.json
- apps/server/test/persistence/admissionBudgetIsolation.test.ts
- apps/server/test/persistence/rolloutEvidence.test.ts
- docs/handoffs/CURRENT.md
- docs/tasks/persist-002-rollout-01-staging-readiness.md

### R4 — readiness gate and final validation corrections

- .gitattributes
- PROJECT_CONTEXT.md
- apps/server/scripts/persistent-rollout-contract.ts
- apps/server/test/persistence/immutablePersistenceTools.test.ts
- apps/server/test/persistence/persistenceToolingSecretTransport.test.ts
- apps/server/test/persistence/persistentRolloutContract.test.ts
- docs/handoffs/CURRENT.md
- docs/ops/persist-002-staging-db-integration-plan.md
- docs/ops/public-arena-caddy-edge-runbook.md
- docs/ops/public-arena-external-staging-runbook.md
- docs/ops/public-arena-staging-runbook.md
- docs/tasks/persist-002-durable-world-identity-foundation.md
- docs/tasks/persist-002-rollout-01-staging-readiness.md

## Additional support files and justification

- .dockerignore: keep private credentials, dump/manifest files and local compiled tools out of build contexts.
- .gitattributes: preserve canonical LF bytes for SQL and systemd fixtures; migration and drop-in Git blobs are unchanged.
- apps/server/scripts/persistent-rollout-contract.ts: isolate strict v3 validation so v2 validation remains intact.
- apps/server/scripts/private-operator-input.ts: shared bounded private projection reader.
- apps/server/scripts/persistence-operator.ts and tsconfig.operator-build.json: compile and dispatch the authorized immutable operations.
- apps/server/scripts/restore-target.ts: marked target creation, freshness/isolation checks and explicit safe cleanup.
- apps/server/scripts/private-smoke-credential.ts: exclusive private credential provisioning and reads.
- apps/server/test/persistence/persistentRolloutContract.test.ts, immutablePersistenceTools.test.ts and rolloutEvidence.test.ts: focused contract, native-container and evidence/permission coverage.
- apps/server/test/persistence/persistenceToolingSecretTransport.test.ts: adapt the existing secret-transport regression to the mandatory same-cluster marked target.

## Final local validation (2026-09-20)

- Node 22.23.2, default Vitest pool, isolated disposable PostgreSQL plus rebuilt local tools image: **57 files passed; 706 tests passed; one POSIX-only test skipped on Windows**. That permission test and the other three evidence tests subsequently passed in Linux (4/4).
- Workspace build and typecheck, both operator/external script configs and operator build: PASS. Existing client large-chunk warning remains.
- Legacy preflight 56 self-tests; v3 contract 24 focused cases; legacy and persistent runtime+tools rendered Compose models: PASS.
- Edge preflight 108 self-tests and template: PASS. Pinned official Caddy 2.11.4 archive SHA-256 verified; real disposable Linux contract: **64 checks PASS**, including secret/log canaries. No host Caddy service was touched.
- Full local CI Compose composition (base/build/integration): server/client built; migration, grants and privilege one-shots exited zero; readiness and external-style loopback gameplay/reconnect smoke passed; server ran as node with baked migration asset; graceful stop exited zero; disposable stack removed.
- Backup/restore round trip, canonical authority/state/count/credential/constraint/target negatives and legacy secret-transport tests: PASS in the full suite.
- Immutable native tools: migration/status/grants/bootstrap/three role checks/backup/restore/cleanup PASS. Instrumented real child processes prove no nested Docker, no secret in argv/environment, and private 0600 PGPASSFILE carrying the password. Output canaries pass.
- Protocol compatibility, movement/combat/client-callback diagnostics: PASS.
- PR classifier: 29 tests PASS; governed-QA routing audit: PASS. High-signal secret scan: 41 files PASS. Diff whitespace check: PASS.
- Earlier attempts are not hidden: Node 24 default-pool IPC failure and native thread-pool crash prompted the supported Node 22 rerun. Full validation exposed one legacy restore fixture still using the old target, corrected here. A run overlapping the final Compose validator edits was discarded; the frozen-code Node 22 run above is the accepted local result.
- No gameplay/identity/limiter/Caddy trust code or SQL migration content changed. No VPS, staging DB, public rollout probes, DNS/TLS changes, publication workflow or deployment was executed.

## Gates still required

1. Exact final PR-head Core SUCCESS and governed QA.
2. Independent consolidated Architecture/Network/Security/Ops/QA review, then PA disposition and human merge consideration. No independent agents were invoked during implementation.
3. Separate deployment GO binding environment, toolchain, operator private locations, immutable image provenance and stop-and-preserve recovery.
4. Actual final-topology Node socket observation through controlled real Caddy; real source-address evidence proving distinct effective admission keys.
5. Live A/B/spoof and host-loopback invalid-proof/log correlation, no durable rows from the invalid-body probes, retained credential provisioning and multiplayer smoke.
6. Live PG private-network/volume/role evidence, migration/schema/domain/world readiness, quiesced backup, isolated same-cluster restore verification and explicit cleanup.

Existing deferred QA-01/QA-02 archival/completeness work and edge-secret rotation remain outside this task. Fresh-auth diagnostic evidence remains INCONCLUSIVE by design; the bounded guest protocol is the acceptance path. Repository evidence does not pre-write deployed success.

## REVIEW-FIX1 — consolidated pre-senior corrections (2026-09-20)

Starting live PR #92 was OPEN, non-draft, at
825f58d9d4921209b70b3831847abc6087d6aaf9 with a clean worktree. Its base and live
main remained ac5ddaac7f70f261fe8357e3fa448ef61c7e56ad. This correction is one
additional commit; R1–R4 history is preserved. This section is the current FIX1
checkpoint; the packet evidence above remains historical.

Review routing remains Architecture, Network, Security and QA, with consolidated
Ops procedure review. Gameplay and Visual remain inapplicable: no gameplay,
balance, protocol, assets or presentation changes. Review is still pending.
No independent agents were invoked in this continuing implementation session.

- M1: private projection reads fail closed on native Windows or absent POSIX UID.
  Immediate parent and opened regular file require invoking-UID ownership and
  no group/other access. Files are non-symlink, nonempty and bounded to 8192 bytes.
  The generic reader has no fixed UID 1000 assumption.
- M2: every tools operation validates private, owned /run/private and /work;
  input contains exactly the operation's projections. Backup requires work write
  access before database work. Host preparation specifies new 0700 directories
  and 0600 projection copies owned by 1000:1000; workstation inputs remain owned
  by the invoking POSIX user. Widening permissions to resolve EACCES is forbidden.
- M3: discriminating phase-a TRUSTED_PEER negatives, positive tools-model controls
  with independent security mutations, and real correctly named rehearsal
  marker/owner/CONNECT isolation negatives exercise the named guards.
- PGDG trust root: GnuPG inspects the downloaded key, then exact primary-key
  fingerprint equality requires B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8 before
  signed APT is enabled. Multiple primary keys fail equality. Verification tooling
  is removed from the final image. Package-version pinning is unchanged.
- Bounded LOW corrections: operation dispatch requires own-property membership;
  local-proof keys must differ canonically from both public sources (including
  mapped IPv4 and IPv6 /64 semantics). Docs require pre-GO nsenter/ss availability
  and correlation excluding healthcheck/direct-loopback sockets from Caddy evidence.

FIX1 file surface: three operator/evidence scripts, deploy/server.Dockerfile,
four existing focused persistence tests, two additional focused test files
(privateOperatorInput.test.ts and pgdgTrustRoot.test.ts), the integration plan
and this task. No workflow change or larger file surface was necessary.

FIX1 local validation:

- Focused Windows contract/private-input/evidence/key tests: 45 passed, four
  POSIX-only cases skipped. All 13 tests across private input, evidence and PGDG
  guard suites passed in a disposable Linux container, including those skips.
  Phase-a contract suite has 36 cases. Prototype keys fail with OPERATION, and
  the isolation negatives fail specifically with RESTORE_ISOLATION.
- Real PostgreSQL backup/restore: four tests passed. Immutable tools integration
  passed directory permission/ownership refusals, migration/status/grants/bootstrap,
  three role checks, backup, isolated restore and explicit cleanup. Native secret
  argv/PGPASSFILE/output canaries passed; legacy secret-transport suite: 31 passed.
- Tools Docker build reached and printed `PGDG full fingerprint verified` before
  enabling the signed repository. Final local tools image runs as UID/GID 1000
  with PostgreSQL 17 clients and no GnuPG/curl. Docker equality-guard tests reject
  wrong/short/empty/multiple-primary-key fingerprints. Runtime image build and
  packaged migration/non-root checks passed. No image was published.
- Full Node 22.23.2 suite with dedicated disposable PostgreSQL and rebuilt tools:
  **59 files passed; 725 tests passed; four POSIX-only tests skipped on Windows**
  (all independently passed in Linux as above). No test failures.
- Workspace build/typecheck, both operator/external script typechecks and operator
  build passed. Existing client bundle-size warning remains.
- Legacy preflight 56, edge preflight 108 and smoke three self-tests passed;
  rendered persistent runtime/tools and legacy Compose template validation passed.
- Protocol compatibility, movement, combat and network callback diagnostics passed.
  Classifier 29 tests and governed-QA audit passed. Existing 41-file secret scan
  and supplemental scan of all 12 FIX1 files passed; git diff --check passed.
- No source gameplay/runtime, package, migration SQL or Caddy asset changes;
  no public probes, host access, staging DB operations, publication or deployment.

Next gates: fresh exact-head Core, fresh exact-head governed QA, bounded Copilot
FIX1 delta verification, Claude clean-session senior consolidated review, then
PA disposition. PUBLIC PERSISTENCE ROLLOUT remains BLOCKED. DEPLOYMENT remains
NOT AUTHORIZED. These corrections are not deployed.
