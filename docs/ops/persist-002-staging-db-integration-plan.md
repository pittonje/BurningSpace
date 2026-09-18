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

Operator procedure for a real staging backup:

```bash
MIGRATION_DATABASE_URL=<burningspace_migrator connection string> \
BACKUP_DATABASE_URL=<burningspace_backup connection string> \
BURNINGSPACE_WORLD_SLUG=public-arena \
BURNINGSPACE_BACKUP_OUTPUT_DIR=/path/to/backups \
  npx tsx apps/server/scripts/backup-dump.ts
```

To restore into a **fresh, isolated** target database and verify it:

```bash
BURNINGSPACE_RESTORE_DUMP_PATH=/path/to/backups/<file>.dump \
MIGRATION_DATABASE_URL=<target burningspace_migrator connection string> \
  npx tsx apps/server/scripts/backup-restore-verify.ts
```

Never restore over the source database.

### Supported connection format for these operator tools (SEC-FIX2)

`MIGRATION_DATABASE_URL`/`BACKUP_DATABASE_URL` above must carry the
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
today.

## Schema-compatibility rollback rule

There is no automatic destructive downgrade path. If a deployed schema
version must be rolled back, the only supported path is: stop the
application, restore the most recent **verified** backup taken before the
migration that needs to be undone, and re-verify with
`backup-restore-verify.ts` before pointing a server at the restored
database. Do not hand-edit `schema_migrations` or attempt to reverse-apply
a migration's SQL.

## Pre-rollout security gate — PERSIST002-NET-02 (MEDIUM, OPEN, BLOCKS PUBLIC PERSISTENCE ROLLOUT)

An independent Network review (NET-FIX1) found that the current
fresh-auth/guest-identity rate limiting keys budgets off the raw transport
peer address, and this deployment does not trust `X-Forwarded-For`,
`X-Real-IP`, or `Forwarded` from any proxy in front of it. Behind a single
effective transport peer (any shared NAT, load balancer, or reverse proxy
that does not preserve distinct per-client peer addresses), every guest
identity created through that peer shares one fresh-auth/guest budget. This
is a **deployment availability constraint** — legitimate concurrent guests
behind the same peer can throttle each other — **not an authentication
bypass or a way to forge another identity's credential**.

Product Architect disposition (SEC-FIX1): deferring NET-02's
**implementation** relative to repository merge is accepted; deferring it
relative to **public persistence deployment** is not. Repository merge may
be considered once the other acceptance gates for this task pass — a merge
is not itself, and does not imply, a public persistence rollout, and no
automatic deployment follows from it.

Public persistence rollout to real staging requires, before it may proceed:

- an implemented admission-budget mitigation (not merely documented);
- spoof-resistance tests (an untrusted client cannot inject a fabricated
  peer identity through whatever trusted-header/trust-boundary mechanism
  the mitigation uses) and multi-client budget tests;
- explicit Security/Ops acceptance of that mitigation;
- a separate, explicit Product Architect deployment authorization.

A publicly documented "bounded operating policy" (e.g. an acceptable
concurrent-guest ceiling), an increased global rate-limit quota, or asking
users to retry more slowly are each, on their own, **not an accepted
mitigation** — they do not close this gate. Any future trusted-proxy
mitigation must define its trust boundary explicitly (which specific proxy
hop is trusted, and why nothing upstream of it can forge the header). Do
**not** start trusting `X-Forwarded-For`/`X-Real-IP`/`Forwarded`, and do
**not** raise fresh-auth/guest-identity rate-limit quotas, as a substitute
for the mitigation above. NET-02 is not marked fixed, waived, or accepted
by this document.

## Not a production or HA claim

This plan describes a single-instance PostgreSQL database with a
persistent volume and role-separated credentials. It is not a
high-availability, replicated, or automatically-failed-over database, and
nothing in this document should be read as claiming otherwise.

## Future operator sequence (real staging, separately authorized)

This is preparation only — every step below requires a separate,
explicit authorization before it touches the real shared-host staging
environment.

1. Confirm the `deploy/server.Dockerfile` prerequisite above has been fixed
   and a new server image built and published.
2. Prepare restricted secrets: generate the four passwords
   (`BURNINGSPACE_DB_ADMIN_PASSWORD`, `BURNINGSPACE_DB_MIGRATOR_PASSWORD`,
   `BURNINGSPACE_DB_RUNTIME_PASSWORD`, `BURNINGSPACE_DB_BACKUP_PASSWORD`)
   using an operator secret manager. Never commit them; fill in a copy of
   `deploy/staging.db.env.example` only in the operator's own secret store.
3. Preserve the existing shared-host `server`/`client` services untouched
   until the steps below complete.
4. Start PostgreSQL only, internal-only:
   `docker compose --env-file <real secrets file> -f deploy/docker-compose.staging.db.yml up -d postgres`.
5. Verify no DB port is published on the host (`docker port` should show
   nothing for `postgres`).
6. Run the migration as `burningspace_migrator`:
   `MIGRATION_DATABASE_URL=<...> npx tsx apps/server/scripts/db-migrate.ts`.
7. Apply runtime/backup grants as `burningspace_migrator`:
   `npx tsx apps/server/scripts/persistence-tooling.ts` helpers, or
   directly `psql -f deploy/postgres/apply-runtime-grants.sql`.
8. Bootstrap the canonical world explicitly:
   `MIGRATION_DATABASE_URL=<...> npx tsx apps/server/scripts/world-bootstrap.ts`.
9. Run `apps/server/scripts/db-privilege-check.ts` against the real roles
   and confirm every assertion passes.
10. Take and verify an initial backup (see above) before any real traffic
    is ever accepted.
11. Add the real `DATABASE_URL` (using `burningspace_runtime`, never
    `burningspace_migrator`) to the operator secret store. Since SEC-FIX1,
    the running server only ever reads `DATABASE_URL` for every runtime
    connection (schema check, writer/maintenance, and the HTTP identity/
    gameplay pool) and never falls back to `MIGRATION_DATABASE_URL` even if
    that variable is still set in the process environment from steps 6/8
    above — there is nothing to remember to unset between the migration
    steps and starting the server.
12. Start or replace the `server` service only under a separately
    authorized rollout step, combining
    `deploy/docker-compose.staging.yml` with
    `deploy/docker-compose.staging.db.yml` (never with
    `deploy/docker-compose.staging.integration.yml`, which is CI-only).
13. Check `/health` and `/ready`.
14. Run a persistence-aware external smoke
    (`apps/server/scripts/external-staging-smoke.ts`) — see the retained
    smoke credential note below.
15. Rollback boundary: if any step from 12 onward fails, stop the new
    server, leave the previous state in place, and do not proceed until
    the failure is understood. Destructive rollback of the database itself
    is only ever a restore from a verified backup (see above) — never an
    automatic downgrade.

## Retained smoke-credential procedure (future)

`apps/server/scripts/external-staging-smoke.ts` accepts an optional
`BURNINGSPACE_SMOKE_CREDENTIAL` environment variable. When set, the smoke
run reuses that operator-provided durable identity instead of creating a
new guest identity through the public `/identity/guest` boundary on every
run — this avoids accumulating an unbounded number of durable guest rows
in the real staging database purely from routine smoke checks.

To provision one: run the smoke script once against real staging without
`BURNINGSPACE_SMOKE_CREDENTIAL` set (it will create and use a synthetic
guest identity), capture that guest's credential out-of-band through the
operator's own secret store (the script itself never prints or logs it),
and set `BURNINGSPACE_SMOKE_CREDENTIAL` in the operator's secret store for
subsequent runs. Never commit this credential to the repository.
