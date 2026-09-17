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

**IMPLEMENTATION PUSHED AS PR #86 (OPEN). CORE PR CHECKS: SUCCESS AT
IMPLEMENTATION CHECKPOINT `0dba3e74562b3d0e395a5cad2a29732512e68515`, AGAIN
AT QA-RECOVERY-001 HEAD `f146a3f2480525f13ae6691bd1fa75cb96927a8f`, AND
AGAIN AT QA-RECOVERY-002 HEAD `097cb92804ede1449f3fc1dca1a8a063f9aa3cef`,
WHERE GOVERNED CLAUDE QA ALSO RAN AND RETURNED "APPROVED WITH
SUGGESTIONS". AN INDEPENDENT ARCHITECTURE REVIEW OF THAT HEAD THEN RAISED
PERSIST002-C-01 (MEDIUM); PRODUCT ARCHITECT DISPOSITION WAS
REQUEST_CHANGES. ARCH-FIX1 (BELOW) IMPLEMENTS THE FIX AND ITS OWN REAL
REGRESSION EVIDENCE. INDEPENDENT DELTA REVIEW OF PERSIST002-C-01, CORE/QA
FOR THE ARCH-FIX1 HEAD, PRODUCT ARCHITECT FINAL ACCEPTANCE, AND HUMAN
MERGE ALL REMAIN OUTSTANDING.**

All seven implementation packets plus four bounded post-implementation
corrections (FIX1–FIX4) are pushed as local sequential commits on
`feat/persist-002-durable-world-identity-foundation`
([PR #86](https://github.com/pittonje/BurningSpace/pull/86), OPEN, not
merged, no auto-merge). Nothing merged, no staging deployment, no
VPS/Contabo contact, no image publication.

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

**FIX2 (`b97f4eb`):** made the persistence CI harness deterministic —
replaced a fixed 8-tick client-test wait with condition polling on the
actual `joinById` call, and gave native Linux CI a working path to the
loopback-only-published test database (`--network host` for the ephemeral
pg_dump/pg_restore/psql tool containers on Linux only; the existing
`host.docker.internal` path on Windows/Mac Docker Desktop is unchanged).

**FIX3 (`793aa6c`):** on native Linux CI, `pg_dump`'s bind-mounted output
file was created container-root-owned, so a later host-side rewrite of
that same file (the backup/restore test's negative corruption case) failed
with `EACCES`. Fixed by running only that one container invocation as the
invoking host UID:GID on Linux; `pg_restore`/`psql` (read-only consumers of
host-mounted files) and the Windows/Mac path are unchanged.

**FIX4 (`0dba3e7`):** the standalone Network client callback diagnostic
(`apps/client/scripts/network-client-callback-check.ts`) predated durable
identity and used its own bespoke test server with no `/identity/guest` or
discovery endpoints, so it could never satisfy the current `NetworkClient`
connect flow. Migrated it onto the real
`startProductionBattleServer({ battleRoomClassOverride: TestBattleRoom })`
composition (real isolated PostgreSQL, real identity/discovery, the real
canonical room, diagnostic-only ship-state controls), with isolated
per-client in-memory identity storage for all four real guest identities
it creates. The CI test-database teardown step was moved to run after this
diagnostic instead of before it.

**Core / Claude QA evidence at implementation checkpoint
`0dba3e74562b3d0e395a5cad2a29732512e68515`:** Core Pull Request Checks —
**SUCCESS** (run `34948430842`, job `104313315933`, attempt 1), all steps
including Caddy edge contract validation and local staging-container
integration. This SUCCESS is bound specifically to that checkpoint, not
to any later commit. Claude QA automation at that same checkpoint (run
`34948430896`, job `104313316185`, attempt 1) did **not** produce a
validated review: the diagnostic sanitizer returned
`execution_file_invalid` for the reviewer's execution transcript (the
precise internal subreason for this historical run is not established,
since its execution file was not captured, and is not claimed to be known
here), and independently the review validator rejected the reviewer's
structured output for an oversized `important_suggestions[0]` (>500
characters); the publisher posted a sanitized failure comment (ID
`5677380407`) before its own next step failed. This is an automation gap,
not a QA verdict on the implementation in either direction.

**QA-RECOVERY-001:** a bounded patch adds fixed, allowlisted
execution-file-invalid subreason codes to the sanitizer for future-run
diagnosability (it does not retroactively establish the unestablished
historical subreason above), and adds conservative generation-guidance
targets to the QA reviewer prompt (well under the existing hard
500/20/100/2000 limits, which are unchanged) to reduce the chance of a
recurrence of the oversized-item failure. It does not change persistence,
authentication, or gameplay behavior. Product Architect inspected the
technical bytes (three files, blob hashes verified unchanged before
commit) and the documentation correction, and approved exactly one
bounded commit/push. That commit was made on top of implementation
checkpoint `0dba3e74562b3d0e395a5cad2a29732512e68515`
(`f146a3f2480525f13ae6691bd1fa75cb96927a8f`) and pushed to PR #86.

**Observed at `f146a3f...`:** Core Pull Request Checks — **SUCCESS** (run
`35093811907`, job `104786149103`, attempt 1), including all later
diagnostics/Caddy/staging-container-integration checks. Claude QA Review
Pilot (run `35093811913`, job `104786148454`, attempt 1) — the reviewer
**did not start**: the Action's own log reports a workflow-content trust
mismatch against the default-branch version of
`.github/workflows/claude-qa-review-pilot.yml` and skips before invoking
the reviewer (not retryable by re-running the same head). The empty
`execution_file` and empty `structured_output` seen at this head were
downstream consequences of that skip, not a reviewer or sanitizer/
validator outcome.

**QA-RECOVERY-002:** restores `.github/workflows/claude-qa-review-pilot.yml`
to the existing trusted default-branch bytes (blob
`89ccd3928ee452ebb23ecb632a7d93b6a3d76ddb`; independently confirmed equal
on the default branch, in the known prior commit
`0dba3e74562b3d0e395a5cad2a29732512e68515`, and in the restored working
tree before commit). This removes the PR's workflow-content difference
without bypassing or weakening the Action's trust validation, and changes
no runtime, permission, tool-policy, or Action-pin behavior. The
generation-guidance enhancement QA-RECOVERY-001 added is thereby
**deferred, not active** on this branch. Following a pre-commit STOP
(restoring the workflow left three audit assertions checking for that
now-removed prompt text with no way to pass without touching the frozen
test file), Product Architect explicitly authorized removing exactly
those three `check(...)` calls in
`.github/scripts/test-claude-qa-audit.py`; no other test, limit, fixture,
or expected exit code in that file changed, and the sanitizer
(`sanitize-claude-diagnostic.py`) remains byte-identical. Safe, allowlisted
`execution_file_invalid` subreason reporting in the sanitizer remains
implemented and unaffected; the historical subreason for the original
`0dba3e7...` QA run's `execution_file_invalid` result remains unknown.

At `097cb92804ede1449f3fc1dca1a8a063f9aa3cef` (QA-RECOVERY-002 head): Core
Pull Request Checks — **SUCCESS** (run `35193478755`), and the governed
Claude QA reviewer ran and returned "Approved with suggestions" (run
`35193478806`). An independent Architecture review of that head then
raised one finding, addressed by ARCH-FIX1 below.

**ARCH-FIX1 — PERSIST002-C-01 (MEDIUM), simulation not fenced on process
authority loss:** the independent Architecture review found that
`BattleRoom.updateSimulation()` (respawn, ship movement, firing,
projectile movement/collision/damage, and simulation-origin combat
broadcasts) ran without checking current process/world authority.
Rejecting new input, or having started asynchronous graceful shutdown,
does not by itself fence that simulation path — the reviewer did not
claim simulation was observed to continue for the full shutdown timeout,
only that the guard was missing. Product Architect disposition:
**REQUEST_CHANGES** (implement a fix; do not accept as residual risk).
The reviewer's original verdict, including its own stated limitation that
it did not personally run the real-PostgreSQL test suites, is preserved
above and is not altered by this fix.

Implementation (`apps/server/src/index.ts`,
`apps/server/src/rooms/BattleRoom.ts`):

- `index.ts` now composes the `writer` capability handed to
  `createProductionRoomDependencies()` from BOTH signals that can declare
  process authority lost — `persistenceRuntime.writer.isControlSafe()`
  (the writer's own local heartbeat/deadline check) AND
  `lifecycle.state === 'ready'` (which the separate schema-maintenance-
  connection authority-loss path, and voluntary graceful shutdown, both
  also affect via the existing `handleAuthorityLost()`/`markFailed()`
  path) — instead of passing the writer object through unchanged. No new
  capability shape, no Pool/URL/database internals exposed to the room,
  no change to writer claim/renewal/expiry algorithms, no change to boot
  order.
- `BattleRoom.ts` adds one private, room-local, synchronous authority
  check (`isProcessAuthoritySafe()`) consulting only the above composed
  signal via the existing `getActiveProductionRoomDependencies()`
  accessor. It fences, at their single entry points: the entire
  simulation tick (`updateSimulation()` — no respawn, movement, firing,
  projectile update/collision/damage, or new combat broadcast from a
  rejected tick); player input application (`handlePlayerInput()`); and
  the async `SET_PROFILE` completion boundary (a durable transaction that
  finishes after authority is lost releases any lease it just acquired
  and returns, without spawning/updating a ship or sending
  `PROFILE_ACCEPTED` — the already-committed durable faction/membership
  is never rolled back, matching the existing generation-mismatch
  branch it sits beside). The check is terminal per room instance once
  authority has genuinely been observed lost (a two-flag latch:
  `hasObservedAuthoritySafe` only becomes true on a genuine safe
  observation, so a room created before the process reaches `'ready'`
  during normal startup is never mistakenly disabled; once safe has been
  observed, a later unsafe observation latches permanently, so a
  subsequent superficially-safe value can never resume the room). No new
  same-process recovery path; the existing bounded shutdown remains
  solely responsible for teardown. Ordinary per-player disconnect
  semantics are unchanged: this is a process/world-authority fence, not a
  per-player control gate, so one player's lost lease or reconnect grace
  never pauses the rest of the world while process authority stays safe.

New regression file
`apps/server/test/persistence/simulationAuthorityGate.test.ts` (8
scenarios, real PostgreSQL, exercising the real `BattleRoom` simulation
path via a real `startProductionServer()` composition with an injected
writer clock, not only a boolean helper): a safe-authority positive
control; authority lost immediately before a tick with a primed
moving/firing ship, a live in-flight projectile aimed at another ship,
and a killed ship whose respawn deadline is crossed only after the
freeze (proving `tryRespawnShip` never runs once frozen); the local
monotonic deadline alone (no lifecycle transition, no heartbeat callback)
freezing the room; the asynchronous-teardown window (`lifecycle.markFailed()`
called directly, mirroring `handleAuthorityLost()`'s own synchronous
`markFailed()` step, deliberately without also triggering its coupled
teardown — a real trigger disposes the room almost immediately regardless
of this fence, which would prove nothing about the fence specifically);
fail-closed when production room dependencies have actually been
uninstalled (via real teardown); the terminal latch surviving a clock
rewound back to an apparently-safe value; a delayed `SET_PROFILE`
completion (gated via the existing `gameplayAuthorityTestHooks` seam)
losing authority mid-flight; and ordinary per-player disconnect not
freezing the rest of the world while authority stays safe. A negative
control was run manually against this task's starting (pre-fix)
`BattleRoom.ts`: 5 of the 8 scenarios failed as expected, confirming the
suite actually detects the defect; the working tree was restored to the
implemented fix afterward (this mutation was never committed).

This implementation is by its author (the same agent that authored the
fix); it is not independently verified merely because a fix now exists.
Independent delta review of PERSIST002-C-01 remains required. No claim is
made here that Core/QA for the resulting new head have already passed —
see `docs/handoffs/CURRENT.md` for what is actually pending.

Next safe action: independent delta review of PERSIST002-C-01, and
observation of the ordinary push-triggered Core/governed-QA results for
the ARCH-FIX1 head once available. Product Architect final acceptance and
human merge remain outstanding.
