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

Packet 1 (this packet) is documentation/authority-only: it opens this task
and reconciles stale PERSIST-001 lifecycle statements left over from before
PR #85 merged. No runtime implementation is authorized by Packet 1.

Next safe action: Execute PERSIST-002 Packet 2 — Migration foundation.
