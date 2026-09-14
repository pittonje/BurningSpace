# PERSIST-002 — Durable World & Identity Foundation

Owner: Product Architect
Risk: HIGH — authentication / persistence / runtime authority
Base: `98bda8f5bed41112f5687eb4ef2fd52a0c82950a` (`origin/main`, merge commit of PR #85)
Branch: `feat/persist-002-durable-world-identity-foundation`

## Authority

PERSIST-001 is MERGED / CLOSED. Its accepted architecture and
[`BS-ARCH-008`](../decisions/BS-ARCH-008.md) through
[`BS-ARCH-011`](../decisions/BS-ARCH-011.md) are the governing authority for
this task. This task does not reopen or reinterpret PERSIST-001 decisions.

- Task: [PERSIST-001 — Persistent World & Durable Identity Architecture](persist-001-persistence-identity-architecture.md)
- Architecture: [Persistent World and Durable Identity Architecture](../architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md)
- Review: [PERSIST-001 Architecture / Security Review](../reviews/persist-001-architecture-security-review.md) — APPROVE, 0 BLOCKER / 0 HIGH / 0 MEDIUM
- Merge: PR #85, merge commit `98bda8f5bed41112f5687eb4ef2fd52a0c82950a`

## Scope

PERSIST-002 implements:

- PostgreSQL integration;
- versioned schema/migrations;
- migration/status/bootstrap tools;
- durable guest identity;
- recovery credential;
- world membership/faction persistence;
- gameplay leases;
- writer fencing;
- singleton canonical world lifecycle;
- readiness integration;
- Level 1 reconnect ownership validation;
- Level 2 durable recovery;
- minimum client credential storage/error UX;
- real PostgreSQL integration tests;
- backup/restore evidence;
- repository-only staging PostgreSQL definition.

## Explicit non-goals

- sectors;
- outposts;
- turrets;
- economy;
- mining;
- logistics;
- portals;
- persistent projectiles;
- durable combat health;
- durable ship transform;
- broad account/auth system;
- email/password/OAuth;
- horizontal server scaling;
- production HA.

## Implementation phases

The approved seven-packet sequence:

1. **Packet 1** — authority + reconciliation (this packet).
2. **Packet 2** — PostgreSQL dependency, lockfile, migration 001, migration
   runner/status, real-PG test DB.
3. **Packet 3** — race-safe world bootstrap, writer fencing, monotonic local
   deadline, readiness.
4. **Packet 4** — guest credential + HTTP identity/discovery endpoints.
5. **Packet 5** — BattleRoom identity wiring, static-safe DI, fresh-auth rate
   limiting, Level 1 reconnect, client identity/discovery flow, existing test
   migration.
6. **Packet 6** — durable membership/faction + gameplay leases + full
   persistence test matrix.
7. **Packet 7** — DB-required container CI, backup/restore proof,
   repository-only staging DB definition.

## Execution directives

1. No push and no PR between Packets 1–6. All seven implementation packets
   are executed locally as sequential commits. First push/PR is allowed only
   after Packet 7 and a complete local validation pass. This avoids knowingly
   publishing intermediate heads whose staging-container CI cannot yet pass
   after DB-required startup is introduced.

2. Canonical server boot order for later implementation:

   ```text
   configuration
   → PostgreSQL connectivity
   → migration/schema compatibility
   → canonical world lookup
   → writer claim / stale operational reconciliation
   → install production room persistence dependencies
   → register production room handler
   → create exactly one canonical BattleRoom
   → publish current roomId for discovery
   → mark RuntimeLifecycle ready
   ```

   Never create the canonical room before the room handler is registered.

3. Backup/restore proof: acceptance backup will use a genuinely
   quiesced/stopped writer. Additionally, a separate real-PostgreSQL recovery
   test must prove that restored or seeded stale active/recovering
   operational leases from an obsolete writer epoch cannot reactivate after a
   new boot.

## Review routing

Required final implementation reviews:

- Architecture
- Network
- Security
- QA

Gameplay: Recommended only; this implementation enforces accepted
faction/session authority rather than changing an accepted gameplay rule.

Visual: Not applicable for the planned minimal reuse of existing
status/error surfaces. If implementation later materially changes
layout/presentation, reconsider this.

Heavy independent reviews should use Claude sessions, not Codex. Mandatory
governed PR checks remain required. Human merge only.

## Deployment boundary

PERSIST-002 implementation does NOT authorize:

- Contabo/VPS access;
- staging DB creation;
- deployment;
- image publication;
- container replacement;
- Caddy changes;
- DNS changes;
- TLS changes;
- production launch.

`deploy/docker-compose.staging.db.yml`, when eventually authored in Packet 7,
is repository preparation only. Actual staging rollout is a separate future
bounded operation.

## Acceptance contract

The PERSIST-001 19-step foundation proof. At minimum:

1. start PostgreSQL;
2. migrate empty DB;
3. explicit world bootstrap;
4. server ready only after persistence recovery;
5. create durable guest identity;
6. assign faction;
7. verify player/world UUID + faction persisted;
8. disconnect;
9. restart application while DB survives, including crash scenario;
10. reconnect with retained credential;
11. same durable player UUID;
12. same faction/world UUID;
13. new transient sessionId/process identity;
14. concurrent duplicate gameplay ownership rejected;
15. stale ownership recoverable within bounded time;
16. invalid/revoked credential and forged UUID cannot claim identity;
17. create backup;
18. restore to fresh isolated DB;
19. prove identity/world/faction/revision/revocation survive and stale
    sessions do not reactivate.

Do not claim battle-state durability.

## Status

**IMPLEMENTATION COMPLETE LOCALLY. LOCAL ACCEPTANCE EVIDENCE COMPLETE.
AWAITING INDEPENDENT REVIEWS, PR CHECKS, PRODUCT ARCHITECT ACCEPTANCE, AND
HUMAN MERGE.**

All seven implementation packets are complete as local sequential commits
on `feat/persist-002-durable-world-identity-foundation`. Not yet pushed, no
PR opened, nothing merged, no staging deployment, no VPS/Contabo contact,
no image publication.

Local acceptance evidence gathered (Packet 7):

- Full real-PostgreSQL test suite (48 files / 446 tests) green, 0 skipped,
  0 failures, run against the real Packet-2 test database.
- `apps/server/test/persistence/backupRestore.test.ts`: a real quiesced
  `pg_dump`/`pg_restore` backup-and-restore cycle against real Docker
  PostgreSQL 17, including durable identity/faction/credential-revocation
  recovery, stale-writer-epoch lease non-reactivation after restore, and a
  negative corrupted-dump SHA-256 integrity test — both tests pass, 0
  skipped.
- `apps/server/scripts/db-privilege-check.ts`: transactional (rollback-safe)
  proof that `burningspace_runtime`/`burningspace_migrator`/
  `burningspace_backup` each have exactly their intended privileges and no
  more, run against the same roles the CI server container uses.
- A CI-only ephemeral integration Compose stack
  (`deploy/docker-compose.staging.integration.yml`) locally validated
  end-to-end: hardening assertions, real migration + grants + privilege
  check, the real production server booting against a real restricted
  `burningspace_runtime` database connection, the updated durable-identity
  `public-arena-smoke.ts` and `external-staging-smoke.ts`, and a clean
  graceful shutdown — with full container/network cleanup afterward.
- A repository-only, never-applied real-staging PostgreSQL definition
  (`deploy/docker-compose.staging.db.yml` +
  `deploy/staging.db.env.example`) and its future operator sequence,
  documented in
  [`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md).

**Packet 7 FIX1 (bounded post-Packet-7 correction):** Product Architect
review of Packet 7 raised one blocker — the production
`deploy/server.Dockerfile` runtime image did not package
`apps/server/db/migrations`, which every server boot needs for its
fail-closed schema-compatibility check, so an immutable image-only staging
rollout would fail to boot. FIX1 corrected this by adding the single
required `COPY` line to `deploy/server.Dockerfile`'s runtime stage, removed
the CI-only bind-mount workaround, added an explicit CI packaging assertion
against the built image, and re-validated the entire local acceptance
evidence set (CI integration stack, backup/restore, full real-PostgreSQL
test suite, typecheck/build) end-to-end with the corrected image. Full
detail in `docs/ops/persist-002-staging-db-integration-plan.md`.

Next safe action: return the final Packet 7 FIX1 commit HEAD to the Product
Architect for exact-head inspection and first push/PR authorization. See
`docs/handoffs/CURRENT.md`.
