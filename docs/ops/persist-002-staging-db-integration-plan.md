# PERSIST-002 Staging Database Integration Plan

> **This document is NOT deployment authorization.** It records the CI-only
> database integration proof performed by PERSIST-002 Packet 7, and
> describes the future operator sequence for bringing up a real staging
> PostgreSQL database using `deploy/docker-compose.staging.db.yml`. Nothing
> in this document authorizes touching the real shared-host staging
> environment. A real rollout remains a later, separately authorized task.

## Scope of what Packet 7 actually did

Packet 7 added and locally validated, against real Docker and real
PostgreSQL 17:

- Role-separated database privilege model (`burningspace_migrator`,
  `burningspace_runtime`, `burningspace_backup`) — see
  `deploy/postgres/init/001-burningspace-roles.sh` and
  `deploy/postgres/apply-runtime-grants.sql`.
- A CI-only, ephemeral, tmpfs-backed integration overlay
  (`deploy/docker-compose.staging.integration.yml`) that stands up postgres
  + migrator + grantor + privilege-checker + the real production server and
  client images together, proving the full persistence-aware boot order.
- Real quiesced backup / restore tooling (`apps/server/scripts/backup-dump.ts`,
  `apps/server/scripts/backup-restore-verify.ts`) and an end-to-end proof
  (`apps/server/test/persistence/backupRestore.test.ts`).
- A repository-only, never-applied definition for a *future* real staging
  database (`deploy/docker-compose.staging.db.yml` +
  `deploy/staging.db.env.example`).

None of this touched `apps/server/src/**`, any migration file, the accepted
runtime authority model, or the real shared-host staging environment.

## `deploy/server.Dockerfile` packaging gap — discovered in Packet 7, corrected in FIX1

**Discovery (Packet 7):** `apps/server/src/persistence/schemaMigrations.ts`
resolves `apps/server/db/migrations` on disk, relative to the running
module, and this directory is read on **every** server boot as part of the
Packet-3 fail-closed schema-compatibility check
(`persistenceRuntime.ts`'s `verifyExactSchemaState`). The `runtime` build
target in `deploy/server.Dockerfile` copied only the compiled
`apps/server/dist` output and never copied `apps/server/db/migrations`
into the image. Before Packet 7, no packet had ever booted the real
production server image against a real database, so this defect was never
exercised or observed.

Effect at the time: the real production server image, run with a real
`DATABASE_URL` exactly as `deploy/docker-compose.staging.yml` configures
it, failed to start with `ENOENT: no such file or directory, scandir
'/app/apps/server/db/migrations'` and retried forever. `deploy/server.Dockerfile`
was outside PERSIST-002 Packet 7's authorized file list, so Packet 7 did
not modify it and instead proved the rest of the CI integration topology
using a CI-only, read-only bind mount of `apps/server/db/migrations` into
the `server` service as a proof-scoped workaround (documented at the time
as not applicable to a real, image-only host).

**Correction (PERSIST-002 Packet 7 FIX1):** Product Architect review of
Packet 7 raised this as the sole blocker — an immutable, image-only staging
rollout would fail to boot. FIX1 adds exactly one line to
`deploy/server.Dockerfile`'s `runtime` stage:

```
COPY --from=build --chown=node:node /app/apps/server/db/migrations ./apps/server/db/migrations
```

The migration SQL authority files are now baked into the immutable runtime
image itself. FIX1 removed the CI-only bind mount from
`deploy/docker-compose.staging.integration.yml` entirely — the CI server
now boots using only files baked into its own image, with no host mount of
any kind. A packaging assertion was added to
`.github/workflows/pr-checks.yml` that runs `docker run --entrypoint test
<built server image> -f /app/apps/server/db/migrations/001_persistent_identity_foundation.sql`
directly against the built image (independent of the running container or
any mount) before the stack is brought up, and confirms the rendered
`server` service carries no `volumes` entry at all. This was locally
validated end-to-end: the full CI integration stack (postgres → migrator →
grants → privilege-checker → server → both smoke scripts → graceful
shutdown) passed with the server reading only its own baked-in migration
files, and the future `deploy/docker-compose.staging.db.yml` +
`deploy/docker-compose.staging.yml` overlay was re-rendered and confirmed
to require no host migration mount either.

This defect is fully resolved; the history above is preserved for audit
rather than erased.

## Runtime / migrator / backup role separation

Three non-superuser, `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
NOREPLICATION NOBYPASSRLS` roles, created by
`deploy/postgres/init/001-burningspace-roles.sh` during official-image
initialization:

- **`burningspace_migrator`** — owns the database and the `public` schema.
  Used only by the migration/bootstrap CLIs and by the snapshot-fence half
  of the backup tool. Full DDL authority; never used by the running game
  server.
- **`burningspace_runtime`** — used by the running game server
  (`DATABASE_URL`). Per `deploy/postgres/apply-runtime-grants.sql`: SELECT
  on `schema_migrations`; SELECT+UPDATE (no INSERT) on `worlds`;
  SELECT+INSERT+UPDATE (no DELETE) on `players`, `player_credentials`,
  `world_memberships`, `active_session_leases`. No CREATE/ALTER/DROP/GRANT
  and no migration-ledger mutation.
- **`burningspace_backup`** — read-only SELECT on all six persistence
  tables, used only by the dump half of the backup tool
  (`pg_dump --snapshot=...`). No INSERT/UPDATE/DELETE/DDL.

`apps/server/scripts/db-privilege-check.ts` proves these exact boundaries
transactionally (with rollback) against real roles; it runs as a one-shot
CI service against the same roles the CI server container uses, and is
also the tool an operator should run against a real staging database
before ever pointing a real server at it.

## Backup and restore procedure

`apps/server/scripts/backup-dump.ts` implements a quiesced,
snapshot-fenced backup:

1. Verify the canonical world has no live, unexpired writer (the
   application must be stopped/quiesced first — this is not a
   zero-downtime backup).
2. `BEGIN ISOLATION LEVEL REPEATABLE READ` as `burningspace_migrator`, lock
   the canonical world row `FOR SHARE` (blocks any writer-claim
   transaction for the duration), `pg_export_snapshot()`, and collect
   manifest metadata — all inside that one transaction.
3. Run `pg_dump -Fc --snapshot=<id>` as `burningspace_backup` in a
   *separate* session while the fence transaction remains open.
4. Only after `pg_dump` succeeds: write the manifest, SHA-256 the dump, and
   `COMMIT` the fence transaction.

`apps/server/scripts/backup-restore-verify.ts` verifies the manifest's
recorded SHA-256 against the actual dump bytes **before** any
`pg_restore` is attempted (a corrupted dump is caught here, not partway
through a restore), restores into a fresh target database with
`pg_restore --exit-on-error`, and then verifies schema-migration
checksums, canonical world identity/state, row counts, credential
active/revoked counts, foreign-key consistency, and expected constraints.

Real staging uses the immutable tools sequence below. The former host npm/tsx
examples are superseded. The VPS receives reviewed deployment assets and
digest-pinned images. Backup needs separate migrator (fence) and backup (dump)
projections together; restore needs the target migrator only. No password goes
into pg client argv. Dumps contain credential hashes: retain/transfer encrypted
copies with restricted access under the operator's existing controls.

### Supported connection format for these operator tools (SEC-FIX2)

The legacy direct-script MIGRATION_DATABASE_URL/BACKUP_DATABASE_URL and v3
private BURNINGSPACE_*_DATABASE_URL projections must carry the
database login password in the URI's **userinfo**
(`postgres://user:password@127.0.0.1/db`), never as a `password=` or
`sslpassword=` **query parameter**. Since PERSIST002-SEC-FIX2, all three
operator tool wrappers (`runPgDumpSnapshot`/`runPgRestore`/`runPsqlFile`
in `apps/server/scripts/persistence-tooling.ts`) reject any connection
URI containing a `password` or `sslpassword` query parameter outright,
before spawning Docker or any PostgreSQL tool — conservatively, by
parameter name, case-insensitively, regardless of whether the value is
empty or a userinfo password is also present. This is a deliberate
restriction, not an oversight: `sslpassword` (a TLS client-certificate
private-key passphrase) is not supported by this tooling's secret
channel at all, which exists only for the ordinary database login
password. An operator connection string that needs an encrypted
client-certificate key is out of scope for these wrappers as they exist
today. The v3 projection validator is stricter: it accepts only the internal
postgres:5432 target, fixed matching role/database and no URL query parameters.
The real tools image uses native clients; legacy disposable workstation tests
may still use the Docker wrapper. Neither path places passwords in argv.

## Schema-compatibility rollback rule

First persistence rollout recovery is **stop-and-preserve**: stop the failed
candidate, preserve the PostgreSQL volume, verified backups and evidence, and
accept controlled unavailability. The old non-persistent binary is not a
compatible persistent-campaign rollback. No DOWN, ledger editing, database
reinitialization or restore over source is allowed. A future return to the old
arena is a separate PA-authorized service-mode fallback with matching client
and edge handling.

## Current pre-rollout gate (2026-09-20)

PERSIST002-NET-02 is **MERGED / CLOSED**, including the paired exact-peer and
cryptographic edge-proof mitigation. See the
[NET-02 closure](../tasks/persist-002-net-02-admission-budget-hardening.md) and
[ROLLOUT-01 task](../tasks/persist-002-rollout-01-staging-readiness.md).
The dated FIX sections below retain their historical checkpoint wording.

Public persistence rollout is **BLOCKED**; deployment is **NOT AUTHORIZED**.
Node honors Caddy's SET-overwritten peer only when both the exact socket peer
and canonical edge proof validate. Ordinary forwarding headers remain untrusted;
quotas are unchanged. Repository acceptance is distinct from deployment acceptance.

Future acceptance requires actual Node-side socket observation on the final
two-network server topology, controlled real-Caddy correlation, two distinct
effective public admission keys, host-local invalid-proof rejection with fixed
log reasons and unconsumed trusted quota, retained-credential smoke, verified
backup/restore, and a separate environment-specific PA deployment GO.
No live result is claimed in this document.

### Historical implementation checkpoints

### PA FIX2 — the trusted peer is not proof of Caddy (2026-09-19)

PA source-delta review raised one HIGH blocker against the FIX1 design,
`PERSIST002-NET02-EDGE-AUTH-01`, and it is now addressed locally.

**The blocker.** The statement above that "nothing upstream of Caddy can forge
the assertion" was true but insufficient. The threat is not upstream of Caddy;
it is *beside* it. In the real staging topology Node observes the Docker
bridge / NAT gateway as the direct socket peer for everything arriving through
the host-published loopback port. That address identifies the host-side Docker
NAT path, **not** the Caddy process. Another local process on the VPS can
reach `127.0.0.1:${BURNINGSPACE_SERVER_BIND_PORT}` and arrive with the same
trusted direct peer as Caddy, then forge `X-BurningSpace-Edge-Peer` and be
treated as an edge-attributed client.

This document must not be read as claiming that the Docker gateway address
uniquely identifies Caddy. It does not.

**The fix.** The exact direct-peer allowlist is retained but demoted to one
factor — a network-location restriction. A second, cryptographic factor
authenticates the Caddy/operator hop: `X-BurningSpace-Edge-Proof`, set by Caddy
from `BURNINGSPACE_EDGE_ASSERTION_SECRET` in its own process environment.
Node honors the peer assertion only when the canonical direct peer is trusted
**and** the proof authenticates. A trusted socket peer alone is not sufficient.

Startup fails closed on any mismatched pair: trusted peers without a valid
secret, or a real secret without trusted peers. The committed examples carry
`none` for both, and `none` is never rollout acceptance.

The server retains only a SHA-256 verifier, hashes the supplied proof before a
`crypto.timingSafeEqual` comparison, and never logs the secret, the verifier,
the supplied proof or the raw header. Diagnostics use only the fixed codes
`edge_proof_missing`, `edge_proof_malformed` and `edge_proof_rejected`. Public
failure shapes are unchanged and no token is consumed for an invalid proof.

**Rollout-time requirements, unchanged and added to.** The exact observed
direct peer must still be measured inside the target container, and must be
**re-measured after any Docker network recreation**. In addition, a freshly
generated 32-byte secret must be installed in both the Caddy process
(as a systemd unit credential loaded from the root-owned
`/etc/caddy/burningspace-edge-assertion-secret`, kept out of the non-secret
`/etc/caddy/burningspace.env` inventory and out of service environment
entirely -- see the FIX3 section below) and the Node server environment.

NET-02 remains **OPEN**. This section records local implementation only.

### PA FIX3 — secure credential transport and canonical proof (2026-09-19)

PA source review of the FIX2 patch accepted the core architecture and returned
three bounded corrections. All three are addressed locally. NET-02 stays
**OPEN**.

**FIX3-A (HIGH) — `PERSIST002-NET02-SECRET-TRANSPORT-01`.** FIX2 delivered the
edge secret to Caddy through `EnvironmentFile=` and read it with
`{$BURNINGSPACE_EDGE_ASSERTION_SECRET}`. PA rejected service environment as
the final transport: the secret exists precisely to stop another host-local
process from impersonating Caddy, so it must not be ordinary service
environment. The approved design uses a systemd unit credential —

- source file `/etc/caddy/burningspace-edge-assertion-secret`, `root:root`,
  `0600`, containing only the raw 43-character value with no `KEY=` prefix and
  no trailing newline;
- drop-in line
  `LoadCredential=burningspace-edge-assertion-secret:/etc/caddy/burningspace-edge-assertion-secret`;
- systemd exposes it to `caddy.service` alone at
  `/run/credentials/caddy.service/burningspace-edge-assertion-secret`;
- the public server route reads it at request time through
  `header_up X-BurningSpace-Edge-Proof {file./run/credentials/...}`.

`EnvironmentFile=` is removed, and the preflight now rejects any
service-environment channel in the drop-in, the environment placeholder in the
template, and any proof source other than the exact credential path. This is
`LoadCredential=`, **not** `LoadCredentialEncrypted=`; no encryption-at-rest
claim is made.

**FIX3-B (LOW) — `PERSIST002-NET02-PROOF-CANON-01`.** The startup parser
already enforced a canonical base64url round-trip; the incoming proof verifier
did not. It now applies the identical check after the 32-byte length test, so
a non-canonical spelling of the real secret is rejected as
`edge_proof_malformed` rather than accepted.

**FIX3-C (MEDIUM) — `PERSIST002-NET02-ENV-EXAMPLE-01`.** A generation command
embedded in `deploy/external-staging.env.example` had been split across lines,
leaving a bare non-comment line containing a quote. That command is removed;
the example now points at the runbook, and the file parses cleanly through
`docker compose --env-file` plus the repository's own preflight parser.

**Rollout-time requirements, restated.** The exact observed direct peer must
still be measured inside the target container and re-measured after any Docker
network recreation. In addition, a freshly generated 32-byte secret must be
written to the Caddy host credential source file described above and supplied
to the Node server environment. Node's own delivery is unchanged in this task
and is deliberately not expanded into Docker-secret architecture.

NET-02 remains **OPEN**. This section records local implementation only.

## Not a production or HA claim

This plan describes a single-instance PostgreSQL database with a
persistent volume and role-separated credentials. It is not a
high-availability, replicated, or automatically-failed-over database, and
nothing in this document should be read as claiming otherwise.

## Future operator sequence — v3 persistent profile

**Not authorized for execution by ROLLOUT-01.** Host access, image publication,
pull/start, database creation/mutation, edge activation and public probes all
require a later deployment GO. Current staging remains the earlier non-persistent
runtime. The unchanged v2 legacy plan must not be used for this persistent path.

### Release and input authority

Bind a reviewed main commit and publication evidence for server, client and
persistence-tools built from that same revision. Verify immutable image digests,
OCI revision and platform against that evidence on the host; a matching name is
insufficient. PG17 is pinned in the v3 template. Migration authority is version 1,
001_persistent_identity_foundation.sql, SHA-256
66bfea878d6113f4f27f4d20e7430de4dd07c97f97408ebbfe25868a46a4f72b.
Schema/domain are exactly 1; world slug is public-arena.

Copy the v3 non-secret inventory/plan examples to ignored workstation files.
Bind origins, images, commit, edge reference and GO. Phase A/template keep
execution false; only a later GO permits phase B true. Production authorization
stays false. Reject alphaNonPersistent, previous-arena rollback images, secrets
and unknown fields.

The GO binds actual operator locations; there is no mandatory secret-store path
or new secret-manager product. Use private directories (0700), private files
(0600 from creation), and no symlinks/shared directories. Tools run as UID/GID
1000 and need read access to their projection and write access only to their
private work directory. File-based smoke/proof operations require a GO-approved
POSIX operator environment; Windows mode bits do not establish private DACLs,
so those operations fail closed on Windows. The VPS needs no Node/npm/tsx or
Git checkout.

Generate independent passwords through the existing private channel; URL-encode
userinfo passwords. Do not echo/source files or put secret values in argv.
Create separate dotenv files with exactly these keys:

| File | Permitted keys |
| --- | --- |
| bootstrap.env | BURNINGSPACE_DB_ADMIN_PASSWORD, BURNINGSPACE_DB_MIGRATOR_PASSWORD, BURNINGSPACE_DB_RUNTIME_PASSWORD, BURNINGSPACE_DB_BACKUP_PASSWORD |
| migrator.env | BURNINGSPACE_MIGRATION_DATABASE_URL |
| runtime.env | BURNINGSPACE_DATABASE_URL, BURNINGSPACE_EDGE_ASSERTION_SECRET |
| backup.env | BURNINGSPACE_BACKUP_DATABASE_URL |
| admin.env | BURNINGSPACE_ADMIN_DATABASE_URL (create/drop only) |
| runtime-db.env | BURNINGSPACE_DATABASE_URL (runtime privilege check only) |

Connections use fixed matching burningspace_admin/migrator/runtime/backup roles,
internal host postgres, port 5432 and database burningspace; only the rehearsal
migrator URL selects its new target database. Empty/example/CI/test/sentinel
credentials and URL query transport fail validation. Preflight compares the
four ordinary projections with the effective Compose environment, including
password conflicts. Each tools directory contains only its operation's files.
Keep smoke credentials and the raw diagnostic proof separate. Caddy retains
the approved root:root 0600 systemd credential source and LoadCredential
transport. Secret hashes are not evidence.

### Compose and preflight

Transfer only the reviewed deployment asset bundle. Its root holds the Compose
files and postgres/init/001-burningspace-roles.sh at that exact relative path;
verify init asset bytes/hash against the reviewed release. Always use base,
then DB, then optional tools overlay. DB-only Compose is incomplete. Build and
integration overlays are CI-only. There is no restore overlay.

The later GO binds these non-secret path variables: DEPLOY_DIR (asset root),
INVENTORY (v3 inventory), PRIVATE_DIR (private projections), OP_INPUT (directory
for exactly one operation's projections), OP_WORK (new private backup directory).
Disable shell tracing; do not retain rendered Compose JSON in ordinary evidence
because it contains passwords. Use a clean controlled shell without inherited
BURNINGSPACE_* overrides; preflight also checks effective bindings.

~~~bash
runtime_compose() {
  docker compose --project-name burningspace-staging \
    --env-file "$INVENTORY" --env-file "$PRIVATE_DIR/bootstrap.env" \
    --env-file "$PRIVATE_DIR/runtime.env" \
    -f "$DEPLOY_DIR/docker-compose.staging.yml" \
    -f "$DEPLOY_DIR/docker-compose.staging.db.yml" "$@"
}
tools_compose() {
  BURNINGSPACE_OPERATION_INPUT_DIR="$OP_INPUT" \
  BURNINGSPACE_OPERATION_WORK_DIR="$OP_WORK" \
  docker compose --project-name burningspace-staging --profile operator \
    --env-file "$INVENTORY" --env-file "$PRIVATE_DIR/bootstrap.env" \
    --env-file "$PRIVATE_DIR/runtime.env" \
    -f "$DEPLOY_DIR/docker-compose.staging.yml" \
    -f "$DEPLOY_DIR/docker-compose.staging.db.yml" \
    -f "$DEPLOY_DIR/docker-compose.staging.tools.yml" "$@"
}
~~~

On the workstation, use the reviewed checkout and installed dependencies.
Feed rendered JSON through a private pipe/file, never ordinary evidence:

~~~bash
npx tsx apps/server/scripts/external-staging-preflight.ts --phase-a \
  --env deploy/.env.persistence --plan deploy/external-staging-persistence-plan.json \
  --private-dir "$PRIVATE_DIR" --deployment-root "$DEPLOY_DIR" --compose-stdin \
  < "$PRIVATE_RENDERED_COMPOSE"
~~~

Repeat with --phase-b only after GO, execution=true, and the workstation checkout
equals the approved target on origin/main. DEPLOY_DIR is the exact host asset
root. Validate runtime and operator-profile models. The host may render them
with the functions above and transfer sensitive output privately to the
workstation; no host validator/development installation is required. Retain
only fixed validator results. Verify the approved asset hashes separately.

### Database and candidate sequence

Use set -euo pipefail. Every failure aborts before the next mutation; commands
below are future GO instructions, not an authorization to execute them now.

1. Preserve the running old arena and OPS-002 evidence. If needed for initial
   candidate configuration, observe its actual socket peer under controlled
   Caddy traffic. This is an observed provisional address, never a subnet guess,
   and is not final-topology acceptance.
2. Under the later publication/pull authorization, pull approved server/client/
   tools/PG digests and verify source revision/platform/RepoDigests. Follow the
   existing bounded registry-login procedure; no host build.
3. Validate models/private projections, then start only PostgreSQL:

~~~bash
runtime_compose up -d --no-deps postgres
runtime_compose ps postgres
docker port "$(runtime_compose ps -q postgres)"
~~~

The final command must show no host port. Verify internal network, named durable
volume, exact init mount and healthy PG status; bound health waiting to 100
seconds. Never reinitialize an existing volume. Server depends_on is not added.

4. Put only migrator.env in OP_INPUT. Run each one-shot and require exit zero:

~~~bash
tools_compose run --rm --no-deps persistence-tools migrate
tools_compose run --rm --no-deps persistence-tools status
tools_compose run --rm --no-deps persistence-tools grants
tools_compose run --rm --no-deps persistence-tools bootstrap
tools_compose run --rm --no-deps persistence-tools check-migrator
~~~

5. Select separate OP_INPUT directories containing only runtime-db.env or only
   backup.env and run check-runtime and check-backup respectively. Retain only
   fixed counts/booleans.
6. Before the persistent candidate accepts traffic, select a fresh OP_WORK and
   an OP_INPUT containing only migrator.env plus backup.env:

~~~bash
tools_compose run --rm --no-deps persistence-tools backup
~~~

The tool exclusively reserves rehearsal.dump (0600), fences the quiesced source,
and writes the private manifest. Existing files/live writers fail closed.
Do not overwrite partial backups; preserve verified encrypted copies under the
GO's retention/access policy.

7. Select OP_INPUT containing only admin.env and create a unique target:

~~~bash
RESTORE_TARGET="bs_rehearsal_$(openssl rand -hex 12)"
tools_compose run --rm --no-deps persistence-tools restore-prepare "$RESTORE_TARGET"
~~~

This is a separate database in the same PG17 cluster, owned by migrator and
denied to PUBLIC/runtime/backup. CREATE refuses existing names. Before restore,
the verifier checks its marker/name/owner/CONNECT denial and absence of user
relations/application schemas. Source data is untouched.

8. Select a separate migrator.env whose database is RESTORE_TARGET (same cluster
   and role), mount only that projection and the backup work directory:

~~~bash
tools_compose run --rm --no-deps persistence-tools restore-verify "$RESTORE_TARGET"
~~~

Require zero exit and schema/domain/world/count/FK/constraint evidence. The
reviewed image's canonical migrations are checked as well as the manifest.
Never connect the public application to this target. After success, explicitly
select admin.env only and clean up:

~~~bash
tools_compose run --rm --no-deps persistence-tools restore-cleanup "$RESTORE_TARGET"
~~~

Cleanup refuses source/unmarked/wrong-owner targets and never uses FORCE. On
failure stop and preserve evidence; disposition stays explicit. A partial
CREATE lacking a marker needs separately reviewed administrator disposition,
not a generic destructive retry.

9. Only after preceding gates and the later candidate-start GO:

~~~bash
runtime_compose up -d --no-deps server client
curl --fail --max-time 5 http://127.0.0.1:2567/health
curl --fail --max-time 5 http://127.0.0.1:2567/ready
~~~

Use the GO-bound port if different. Existing /ready gates persistence boot,
exact schema/world/domain validation, writer ownership and canonical room
initialization. No new endpoint is needed; liveness alone is insufficient.

10. Measure on the FINAL candidate topology before acceptance. On peer mismatch,
    stop candidate, bind the observed literal, revalidate, restart under GO and
    repeat. Prior-topology observation never satisfies this gate. Follow the
    Caddy credential/unit/config activation runbook under the later GO; none is
    never public-persistence acceptance.
11. Complete the evidence protocol and retained-credential smoke below. On any
    post-start failure: runtime_compose stop server. Preserve volume, backups,
    private inputs and evidence; accept controlled downtime. No old-image switch,
    source restore, DOWN, ledger edits, volume removal or database reset.

### Final socket-peer and admission evidence

Identify the final server container ID/PID, networks, reviewed commit/digests,
run ID and edge reference. During controlled traffic through real Caddy, use
already-approved host tools to observe numeric established sockets inside the
actual server network namespace:

~~~bash
SERVER_ID="$(runtime_compose ps -q server)"
SERVER_PID="$(docker inspect --format '{{.State.Pid}}' "$SERVER_ID")"
sudo nsenter --target "$SERVER_PID" --net \
  ss -Hntp state established '( sport = :2567 )'
~~~

Bound observation to at most 20 seconds/20 samples. Correlate one controlled
request or WebSocket (no printed credential) with Caddy-side time/source
observation. Record the actual Node socket peer, never a host-side socket or
Docker-subnet inference. No payload capture, verbose header logs, peer-debug
endpoint or ad hoc host service. If observation is not discriminating, stop
INCONCLUSIVE and obtain a revised GO procedure.

Use two real public paths with different IPv4 addresses or IPv6 /64s. Ordinary
ISP plus independent cellular is a useful default, not a provider requirement.
Two devices behind one NAT do not qualify. Actual addresses must come from
controlled Caddy-side observation; runner labels/forwarded-header claims cannot
establish distinctness.

Each runner's non-secret JSON has exactly the AdmissionConfig fields exported
by external-staging-admission-smoke.ts: runId (32 hex), targetCommit (40 hex),
environmentId, topologyId, edgeConfigId, serverOrigin, allowedOrigin,
sourceAddress, nodePeer. Bind the same run/topology/commit/edge. Synchronize
clocks and arrange a quiet, fully refilled window, then coordinate:

~~~bash
# Source A: three invalid-body 400s, then 429.
npx tsx apps/server/scripts/external-staging-admission-smoke.ts a-exhaust source-a.json > a.json
# Source B while A stays exhausted: one 400.
npx tsx apps/server/scripts/external-staging-admission-smoke.ts b-isolation source-b.json > b.json
# Source A: control and four spoof-negative 429s.
npx tsx apps/server/scripts/external-staging-admission-smoke.ts a-spoof source-a.json > spoof.json
~~~

All phases must finish within 20 seconds in order. Requests have 1500 ms
deadlines, 512-byte response caps, body exactly {}, no retry/redirect. They
create zero durable guests. Ambiguous timing, shared keys or unexpected
responses are INCONCLUSIVE. Arrange a new quiet/refill window before any
reviewed rerun. Fresh-auth remains explicitly INCONCLUSIVE; the deterministic
guest proof is the required path.

The separate local-proof phase must reach the actual host loopback-published
Node path. From the approved POSIX operator environment, a separately authorized
SSH local forward to host 127.0.0.1:<Node port> permits this without Node tooling
on the VPS, a new host service, or tools-container host networking. Correlate its
actual Node peer too. In local-proof.json use the forward's exact 127.0.0.1 HTTP
origin and an unused controlled synthetic source (e.g. 198.51.100.254), preserving
all other evidence bindings. Pass the actual canonical raw proof through a
separate 0600 private file:

~~~bash
npx tsx apps/server/scripts/external-staging-admission-smoke.ts \
  local-proof local-proof.json "$PRIVATE_PROOF_FILE" > local.json
~~~

Four rejected proofs (missing/malformed/canonical-incorrect/repeated) must leave
three correct-proof invalid bodies getting 400 before the fourth gets 429.
Use a quiet log window so diagnostic rate suppression does not hide required
reasons. Retain only bounded timestamp/event/reason records for
admission_trusted_edge_assertion_rejected with edge_proof_missing,
edge_proof_malformed and edge_proof_rejected inside the phase window.
Never retain headers, proof values, credentials or secret hashes.

Assemble {a,b,spoof,local,observation,proofLogs} using the strict PeerObservation
schema, full server container ID, timestamp and references to retained non-secret
socket/source observations, then validate:

~~~bash
npx tsx apps/server/scripts/external-staging-admission-smoke.ts validate evidence-bundle.json
~~~

This validates consistency of supplied evidence; independent review must inspect
the referenced observations. It cannot manufacture/certify a measurement or
grant deployment permission.

### Retained smoke credential

In the approved POSIX operator environment, use an existing private directory
and a new output filename. The file is exclusively reserved at 0600 before the
single issuance request; no credential reaches stdout/logs/evidence:

~~~bash
npx tsx apps/server/scripts/external-staging-smoke.ts \
  --provision-credential "$PRIVATE_SMOKE_FILE"
BURNINGSPACE_SMOKE_CREDENTIAL_FILE="$PRIVATE_SMOKE_FILE" \
  npx tsx apps/server/scripts/external-staging-smoke.ts
~~~

Set the existing BURNINGSPACE_EXTERNAL_SMOKE_CLIENT_ORIGIN, SERVER_ORIGIN,
ALLOWED_ORIGIN and HOSTILE_ORIGIN variables using the full prefix for each.
Provisioning needs SERVER_ORIGIN and ALLOWED_ORIGIN. External smoke requires
retained input; only explicit loopback runs may create a temporary identity.
An existing output is refused before issuance. Failure leaves a private reserved
file for explicit disposition. Never capture a credential from ordinary smoke
output. Provisioning creates one durable guest and is separate from the zero-row
admission diagnostic.
